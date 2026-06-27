import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {

    const user = await currentUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {

        const email =
            user.primaryEmailAddress?.emailAddress ?? "";

        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        // USER DOES NOT EXIST
        if (userResult.length === 0) {

            const newUser = await db
                .insert(users)
                .values({
                    email,
                    name: user.firstName ?? "New User",
                    //credits: 1000,
                })
                .returning();

            return NextResponse.json({
                user: newUser[0],
                message: "User created",
            });
        }

        // USER ALREADY EXISTS
        return NextResponse.json({
            user: userResult[0],
            message: "User already exists",
        });

    } catch (e) {

        console.error("Error creating user:", e);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}