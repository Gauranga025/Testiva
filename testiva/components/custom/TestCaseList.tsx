import React, { useState } from 'react'
import { TestCase } from './UserRepoList';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Play, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import TestCaseSettingDialog from './TestCaseSettingDialog';
import axios from 'axios';

type Props = {
    testCases: TestCase[];
    onReload: any;
    targetDomain: string;
}

function TestCaseList({ testCases, onReload, targetDomain }: Props) {

    const [selectedTestCases, setSelectedTestCases] = useState<TestCase[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleSelectTestCase = (checked: boolean | string, testCase: TestCase) => {
        if (checked) {
            setSelectedTestCases((prev) => [...prev, testCase]);
        } else {
            setSelectedTestCases((prev) => prev.filter((item) => item.id !== testCase.id));
        }
    }

    const runTests = async () => {
        if (selectedTestCases.length === 0) return;
        setIsRunning(true);

        // Fetch token from your existing endpoint
        const tokenRes = await axios.get('/api/github/token');
        console.log("TOKEN RESPONSE:", tokenRes.data);
        const githubToken = tokenRes.data.token;

        for (const testCase of selectedTestCases) {
            try {
                console.log("FRONTEND TOKEN:", githubToken);
                const result = await axios.post('/api/test-cases/run', {
                    testCaseId: testCase.id,
                    baseUrl: targetDomain,
                    githubToken,        // ← add this
                });

                const { sessionUrl } = result.data;
                if (sessionUrl) {
                    window.open(sessionUrl, '_blank');
                }
            } catch (err) {
                console.error(`Failed to run test case ${testCase.id}:`, err);
            }
        }

        setIsRunning(false);
        onReload(selectedTestCases[0]?.repoId);
    };

    return (
        <div className='mt-6'>

            {/* Header */}
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6'>
                <div className='flex items-start gap-4'>
                    <div className='h-12 w-12 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm'>
                        <Play className='h-5 w-5 text-white' />
                    </div>
                    <div>
                        <h2 className='text-3xl font-bold tracking-tight text-gray-900'>
                            Generated Test Cases
                        </h2>
                        <p className='text-sm text-gray-500 mt-1 max-w-xl leading-relaxed'>
                            AI-crafted test flows for your repository
                        </p>
                    </div>
                </div>

                <div className='flex items-center gap-3'>
                    <Badge className='px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold shadow-sm'>
                        {testCases.length} Cases
                    </Badge>
                    <Button
                        size='sm'
                        variant='outline'
                        className='rounded-xl border-gray-200 hover:bg-gray-100 px-4 shadow-sm transition-all'
                        onClick={() => onReload(testCases[0]?.repoId)}
                    >
                        <RefreshCw className='h-4 w-4 mr-2' />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Test Case List */}
            <div className='border border-gray-200 rounded-3xl overflow-hidden bg-white shadow-sm backdrop-blur-sm'>
                {testCases.map((testCase, index) => (
                    <div
                        key={index}
                        className='px-6 py-5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/80 transition-all duration-200'
                    >
                        <div className='flex items-start gap-4 flex-1'>
                            <div className='pt-1'>
                                <Checkbox
                                    checked={selectedTestCases.some((item) => item.id === testCase?.id)}
                                    onCheckedChange={(checked) => handleSelectTestCase(checked, testCase)}
                                />
                            </div>
                            <div className='flex flex-col gap-1'>
                                <h2 className='text-[15px] font-semibold text-gray-900 leading-tight'>
                                    {testCase?.title}
                                </h2>
                                <p className='text-sm text-gray-500 leading-relaxed max-w-3xl'>
                                    {testCase?.description}
                                </p>
                            </div>
                        </div>

                        <div className='flex items-center gap-3 ml-4'>
                            <Badge variant="secondary" className='capitalize rounded-full px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium shadow-sm'>
                                {testCase?.type}
                            </Badge>

                            {testCase?.status === 'failed' && (
                                <Badge className='rounded-full px-3 py-1 bg-red-50 text-red-700 border border-red-200 font-medium shadow-sm'>Failed</Badge>
                            )}
                            {testCase?.status === 'passed' && (
                                <Badge className='rounded-full px-3 py-1 bg-green-50 text-green-700 border border-green-200 font-medium shadow-sm'>Passed</Badge>
                            )}
                            {testCase?.status === 'running' && (
                                <Badge className='rounded-full px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-medium shadow-sm animate-pulse'>Running</Badge>
                            )}
                            {testCase?.status === 'gemini_error' && (
                                <Badge
                                    className='rounded-full px-3 py-1
        bg-purple-50 text-purple-700
        border border-purple-200
        font-medium shadow-sm'
                                >
                                    Execution Error
                                </Badge>
                            )}

                            <TestCaseSettingDialog testCase={testCase} setReload={onReload} />
                        </div>
                    </div>
                ))}

                {/* Footer */}
                <div className='px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-gray-50 to-gray-100 border-t border-gray-200'>
                    <div>
                        <h2 className='font-semibold text-gray-800 text-base'>
                            Run Selected Test Cases
                        </h2>
                        <p className='text-sm text-gray-500 mt-1'>
                            Execute AI-generated automated browser test flows instantly.
                        </p>
                    </div>

                    <Button
                        className='gap-2 rounded-xl px-6 h-11 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600
                        hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700
                        text-white shadow-lg shadow-indigo-500/20 transition-all duration-300'
                        disabled={selectedTestCases.length === 0 || isRunning}
                        onClick={runTests}
                    >
                        {isRunning
                            ? <Loader2 className='h-4 w-4 animate-spin' />
                            : <Play className='h-4 w-4' />
                        }
                        {isRunning ? 'Running...' : 'Run Tests'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default TestCaseList