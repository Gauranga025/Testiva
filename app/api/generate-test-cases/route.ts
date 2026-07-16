import { NextRequest, NextResponse } from "next/server";
import { generateStructured, Type } from "@/lib/ai/provider";   // ← changed
import { db, TestCasesTable, users } from "@/db";
import { repositories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRepoTree, readGithubFile } from "@/lib/github";
import { currentUser } from "@clerk/nextjs/server";
import { decrypt } from "@/lib/crypto";
import { generateTestCasesLimiter } from "@/lib/rate-limiter";
import { formatLogLine } from "@/lib/execution/logger";

// ─── removed: const ai = new GoogleGenAI(...)  (now handled by provider) ─────

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      userId,
      repoId,
      owner,
      repo,
      branch = "main",
    } = body;

    if (!userId || !owner || !repo) {
      return NextResponse.json(
        {
          error: "userId, owner, and repo are required",
        },
        { status: 400 }
      );
    }

    // Get GitHub token from database
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!userRecord || !userRecord.githubToken) {
      return NextResponse.json(
        {
          error: "GitHub is not connected. Please connect your GitHub account before generating test cases.",
        },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateLimit = generateTestCasesLimiter.consume(userRecord.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
      );
    }

    const githubToken = decrypt(userRecord.githubToken, process.env.TOKEN_ENCRYPTION_KEY || '');

    // Verify the authenticated Clerk user actually owns the local user
    // record referenced by `userId` in the request body.
    const [localUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!localUser || String(localUser.id) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Get repo tree
    const repoFiles = await getRepoTree({
      owner,
      repo,
      branch,
      githubToken,
    });

    // 2. Read useful files
    const fileContents = await Promise.all(
      repoFiles.map((file: any) =>
        readGithubFile({
          owner,
          repo,
          branch,
          path: file.path,
          githubToken,
        })
      )
    );

    const validFiles = fileContents.filter(Boolean);

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No useful source files found in this repository",
        },
        { status: 400 }
      );
    }

    // 3. Prepare compact repo context
    const repoContext = validFiles
      .map(
        (file: any) => `
File Path: ${file.path}

File Content:
${file.content}
`
      )
      .join("\n\n----------------------\n\n");

    // 4. Ask AI to generate test cases with metadata
    const prompt = `
You are an expert QA automation engineer.

Analyze the GitHub repository source code and generate useful small test cases.

Your goal:
Generate test cases that can later be converted into Playwright / Browserbase automation scripts.

Repository:
Owner: ${owner}
Repo: ${repo}
Branch: ${branch}

Repository File Context:
${repoContext}

Generate 5 to 10 test cases.

Each test case must include:
- title: clear test case title
- description: one-line description
- type: one of ui, auth, api, form, integration, edge-case
- priority: low, medium, high
- targetRoute: most likely app route/page to test, for example /sign-in, /dashboard, /api/users
- targetFiles: related file paths from the repository context
- expectedResult: what should happen when the test passes

Important Rules:
- Only use file paths that exist in the repository context.
- Do not invent fake target files.
- If route is unclear, infer from Next.js app/page structure.
- Keep description short, only one line.
- Return only valid JSON matching this exact schema:
  { "testCases": [ { "title", "description", "type", "priority", "targetRoute", "targetFiles", "expectedResult" } ] }
`;

    // ─── changed block start ─────────────────────────────────────────────────
    // Previously: ai.models.generateContent({ model: "gemini-3.5-flash", ... })
    // Now: generateStructured() — Gemini 2.5 Flash + exponential backoff +
    //      automatic GPT-4.1 Mini fallback. Response shape is identical.
    const schema = {
      type: Type.OBJECT,
      properties: {
        testCases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title:          { type: Type.STRING },
              description:    { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: ["ui","auth","api","form","integration","edge-case"],
              },
              priority: {
                type: Type.STRING,
                enum: ["low","medium","high"],
              },
              targetRoute:    { type: Type.STRING },
              targetFiles:    { type: Type.ARRAY, items: { type: Type.STRING } },
              expectedResult: { type: Type.STRING },
            },
            required: [
              "title","description","type","priority",
              "targetRoute","targetFiles","expectedResult",
            ],
          },
        },
      },
      required: ["testCases"],
    };

    const { data: aiResult, provider } = await generateStructured<{
      testCases: any[];
    }>(prompt, schema);

    console.log(formatLogLine("[GENERATE_TEST_CASES]", `AI provider used: ${provider}`));
    // ─── changed block end ───────────────────────────────────────────────────

    const testCases = aiResult.testCases || [];

    if (!testCases.length) {
      return NextResponse.json(
        {
          error: "AI did not generate any test cases",
        },
        { status: 400 }
      );
    }

    // 5. Save generated test cases to Neon DB
    const insertedTestCases = await db
      .insert(TestCasesTable)
      .values(
        testCases.map((testCase: any) => ({
          userId,
          repoId,
          repoName: repo,
          repoOwner: owner,
          branch,

          title:          testCase.title,
          description:    testCase.description,
          type:           testCase.type,
          priority:       testCase.priority,

          targetRoute:    testCase.targetRoute,
          targetFiles:    testCase.targetFiles || [],
          expectedResult: testCase.expectedResult,

          status: "generated",
        }))
      )
      .returning();

    await db
      .update(repositories)
      .set({ uiDiscoveryCache: null })
      .where(eq(repositories.repoId, parseInt(repoId, 10)));

    return NextResponse.json({
      success: true,
      message: "Test cases generated successfully",
      count:   insertedTestCases.length,
      testCases: insertedTestCases,
    });

  } catch (error: any) {
    console.error(formatLogLine("[GENERATE_TEST_CASES]", `Error: ${error.message || String(error)}`));

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate test cases",
      },
      { status: 500 }
    );
  }
}