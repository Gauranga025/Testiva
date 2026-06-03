import React, { useContext, useState } from 'react'
import { UserRepo } from './WorkspaceBody';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Image from 'next/image';
import { CheckCircle2, ListChecks, Loader2, Loader2Icon, Sparkles, TrendingUp, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import axios from 'axios';
import { UserDetailContext } from '@/context/UserDetailContext';
import TestCaseList from './TestCaseList';

type props = {
    repoList: UserRepo[];
}

export type TestCase = {
    id: number;
    title: string;
    description: string;
    type: string;
    repoId: number;
    targetFiles: string[];
    expectedResult : string;
    repoName: string;
    repoOwner: string;
    targetRoute : string;
}

type StatusData = {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
}
function UserRepoList({ repoList }: props) {
    const [statusData, setStatusData] = useState<StatusData>({
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 0,
    });
    
    const { userDetail } = useContext(UserDetailContext);
    const [loading, setLoading] = useState(false);
    const [testCaseLoading, setTestCaseLoading] = useState(false);
    const [testCases, setTestCases] = useState<TestCase[]>([]);

    const handleGenerateTestCases = async (repo: UserRepo) => {
        setLoading(true);
        const result = await axios.post("/api/generate-test-cases", {
            userId: userDetail?.id,
            repoId: repo?.repoId,
            owner: repo.owner,
            repo: repo.name,
            branch: repo.defaultBranch,
        });

        console.log(result.data);
        setLoading(false);
    }

    const GetTestCases = async (repoId: number) => {
        // Fetch test cases for the selected repository and update the state
        setTestCaseLoading(true);
        setTestCases([]);
        const result = await axios.get(`/api/test-cases?repoId=${repoId}`);
        console.log(result.data);
        setStatusData({
            totalTests: result.data.length,
            passedTests: 0,
            failedTests: 0,
            passRate: 0,
        });
        setTestCases(result.data);
        setTestCaseLoading(false);
    }
    return (
        <div className='mt-5'>
            <h2 className='text-2xl font-medium mb-5'>Your Connected Repositories</h2>
            {repoList.length === 0 && <p className='text-gray-500'>No repositories added yet. Click on "Add Repo" to connect your GitHub repository.</p>}
            <Accordion type="single" collapsible defaultValue="item-1"
                onValueChange={(value) => GetTestCases(Number(value))}
            >
                {repoList.map((repo, index) => (

                    <AccordionItem key={repo.repoId} value={(repo.repoId).toString()} className="border p-4 rounded-lg mb-2 hover:bg-gray-50 mt-5">
                        <AccordionTrigger>
                            <div className='flex items-center gap-2'>
                                <Image src="/GithubIcon.png" alt="Github" width={30} height={30} className='inline-block mr-2' />
                                <div className='flex flex-col items-start gap-1'>
                                    <h2>{repo.fullName}</h2>
                                    <p className='text-sm text-gray-500'>
                                        {repo.defaultBranch} 🟢 {repo.language} 🟢 {repo.private ? "Private" : "Public"}
                                    </p>
                                </div>

                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className='pt-4 space-y-5'>

                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>

                                    <StatusCard
                                        title="Total Tests"
                                        value={statusData?.totalTests}
                                        icon={<ListChecks className='h-5 w-5 text-blue-600' />}
                                        bgColor="bg-blue-50"
                                    />

                                    <StatusCard
                                        title="Passed"
                                        value={statusData?.passedTests}
                                        icon={<CheckCircle2 className='h-5 w-5 text-green-600' />}
                                        bgColor="bg-green-50"
                                    />

                                    <StatusCard
                                        title="Failed"
                                        value={statusData?.failedTests}
                                        icon={<XCircle className='h-5 w-5 text-red-600' />}
                                        bgColor="bg-red-50"
                                    />

                                    <StatusCard
                                        title="Pass Rate"
                                        value={`${statusData?.passRate}%`}
                                        icon={<TrendingUp className='h-5 w-5 text-purple-600' />}
                                        bgColor="bg-purple-50"
                                    />
                                </div>

                                { !testCaseLoading && testCases.length > 0 && <TestCaseList testCases = {testCases} onReload={(repoId: number) =>GetTestCases(repoId)}/> }

                                {testCaseLoading ?
                                    <h2 className='flex items-center gap-2'>
                                        <Loader2Icon className="animate-spin" /> Please wait...
                                    </h2>
                                    :
                                    testCases?.length === 0 &&
                                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl bg-gray-50'>

                                        <div>
                                            <h3 className='font-medium'>
                                                {loading ? "Generating Test Cases..." : "Generate AI Test Cases"}
                                            </h3>

                                            <p className='text-sm text-gray-500 mt-1'>
                                                Analyze this repository and generate automated
                                                test cases using AI.
                                            </p>
                                        </div>

                                        <Button className='gap-2' onClick={() => handleGenerateTestCases(repo)} disabled={loading}>
                                            {loading ? (
                                                <Loader2 className="animate-spin" />
                                            ) : (
                                                <Sparkles className='h-4 w-4' />
                                            )}
                                            Generate Test Cases
                                        </Button>
                                    </div>
                                }
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}

export default UserRepoList


//Status Card Component
function StatusCard({
    title,
    value,
    icon,
    bgColor
}: {
    title: string
    value: string | number
    icon: React.ReactNode
    bgColor: string
}) {
    return (
        <div className='border rounded-xl p-4 flex items-center justify-between bg-white'>
            <div>
                <p className='text-sm text-gray-500'>{title}</p>
                <h3 className='text-2xl font-semibold mt-1'>{value}</h3>
            </div>

            <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${bgColor}`}
            >
                {icon}
            </div>
        </div>
    )
}