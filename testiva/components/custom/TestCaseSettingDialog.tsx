import React, { useEffect, useState } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { SettingsIcon } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { TestCase } from './UserRepoList'
import axios from 'axios'

type props = {
    testCase?: TestCase;
    setReload: any;
}
function TestCaseSettingDialog({ testCase, setReload }: props) {

    const [formTestCase, setFormTestCase] = useState({
        title: testCase?.title || '',
        description: testCase?.description || '',
        targetRoute: testCase?.targetRoute || '',
        expectedResult: testCase?.expectedResult || '',
    });


    const handleInputChange = (fieldName: string, value: string) => {
        setFormTestCase((prev) => ({
            ...prev,
            [fieldName]: value,
        }));
    }

    const updateCase = async() => {
        const result = await axios.post('/api/test-cases/settings', {
            ...formTestCase,
            testCaseId: testCase?.id,
        });
        console.log('Updated Test Case:', result?.data);
        setReload();
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className='rounded-xl border-gray-200 hover:bg-gray-100 hover:border-gray-300 shadow-sm transition-all'
                >
                    <SettingsIcon className='h-4 w-4 text-gray-600 cursor-pointer' />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl p-0 overflow-hidden">

                {/* Header */}
                <div className="px-6 pt-6 pb-5 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">

                    <DialogHeader>

                        <div className="flex items-start gap-3">

                            <div className="h-10 w-10 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
                                <SettingsIcon className="h-4 w-4 text-white" />
                            </div>

                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight text-gray-900">
                                    Edit Testing Requirements
                                </DialogTitle>

                                <DialogDescription className="text-sm text-gray-500 mt-1 leading-relaxed">
                                    Update requirements before regenerating AI-crafted test flows.
                                </DialogDescription>
                            </div>

                        </div>

                    </DialogHeader>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-5">

                    {/* Test Title */}
                    <div>
                        <label className='block text-xs font-semibold text-gray-700 tracking-wide'>
                            TEST TITLE
                        </label>

                        <input
                            value={formTestCase?.title}
                            onChange={(event) => handleInputChange('title', event.target?.value)}
                            className="mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm placeholder:text-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. Verify login redirects correctly"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className='block text-xs font-semibold text-gray-700 tracking-wide'>
                            DESCRIPTION ACTION
                        </label>

                        <Textarea
                            value={formTestCase?.description}
                            onChange={(event) => handleInputChange('description', event.target?.value)}
                            placeholder="Describe the workflow or validation logic."
                            className="mt-2 min-h-22.5 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm placeholder:text-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Route */}
                    <div>
                        <label className='block text-xs font-semibold text-gray-700 tracking-wide'>
                            TARGET ROUTE / PATH
                        </label>

                        <input
                            value={formTestCase?.targetRoute}
                            onChange={(event) => handleInputChange('targetRoute', event.target?.value)}
                            placeholder="e.g. /login"
                            className="mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm placeholder:text-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 "
                        />
                    </div>

                    {/* Expected Result */}
                    <div>
                        <label className='block text-xs font-semibold text-gray-700 tracking-wide'>
                            EXPECTED RESULT
                        </label>

                        <Textarea
                            value={formTestCase?.expectedResult}
                            onChange={(event) => handleInputChange('expectedResult', event.target?.value)}
                            placeholder="Describe the expected successful outcome."
                            className="mt-2 min-h-22.5 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm placeholder:text-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3">

                    <Button
                        variant="outline"
                        className="rounded-xl border-gray-200 hover:bg-gray-100 px-5"
                    >
                        Cancel
                    </Button>

                    <Button className="rounded-xl px-5 bg-linear-to-r
                     from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 
                     hover:to-purple-700 shadow-md"
                        onClick={updateCase}
                    >
                        Update Case
                    </Button>

                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}

export default TestCaseSettingDialog