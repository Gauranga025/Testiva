import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '../ui/button'
import { FileText, Globe2Icon, Settings2 } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { UserRepo } from './WorkspaceBody'
import axios from 'axios'

type props={
    repo: UserRepo
    setReload: () => void
}
function RepoSettings({repo, setReload}:props) {

    const [isOpen, setIsOpen] = useState(false);
    const [repoSettings, setRepoSettings] = useState({
        targetDomain: repo?.targetDomain || ' ',
        globalInstruction: repo?.globalInstruction || ' '
    });

    const handleSaveSettings = async () => {
        console.log('Saved Settings:', repoSettings)
        const result = await axios.post('/api/user-repo/settings', {
            repoId: repo.repoId,
            targetDomain: repoSettings.targetDomain,
            globalInstruction: repoSettings.globalInstruction,
        });
        setIsOpen(false);
        setReload();
    }
    return (
        <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="rounded-xl border-indigo-200 bg-white hover:bg-indigo-50 px-6 h-12 text-indigo-600 font-semibold shadow-sm"
                >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Project Config
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-3xl border border-gray-200">

                {/* Header */}
                <div className="px-6 py-5 border-b bg-linear-to-r from-slate-50 to-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl">
                            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                                <Settings2 className="h-5 w-5 text-white" />
                            </div>

                            <span>Project/Repo Settings</span>
                        </DialogTitle>

                        <DialogDescription className="text-sm text-gray-500 mt-2">
                            Configure project-level defaults used during script generation and execution
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* App URL */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">

                        <div className="flex gap-4">

                            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <Globe2Icon className="h-6 w-6 text-indigo-600" />
                            </div>

                            <div className="flex-1">

                                <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                                    App URL / Default Website
                                </label>

                                <input
                                    value = {repoSettings?.targetDomain}
                                    onChange={(e) => setRepoSettings({...repoSettings, targetDomain:e.target.value})}
                                    placeholder="https://your-app.com"
                                    className="
                                mt-3
                                w-full
                                h-12
                                rounded-xl
                                border
                                border-gray-200
                                px-4
                                text-sm
                                shadow-sm
                                focus:outline-none
                                focus:ring-2
                                focus:ring-indigo-500
                                focus:border-indigo-500
                            "
                                />

                                <p className="mt-2 text-xs text-gray-500">
                                    The target address where automated headless browsers connect and execute test flows.
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* Global Instructions */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-5">

                        <div className="flex gap-4">

                            <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                                <FileText className="h-6 w-6 text-violet-600" />
                            </div>

                            <div className="flex-1">

                                <label className="block text-sm font-semibold text-gray-800 uppercase tracking-wide">
                                    Global Test Instructions
                                </label>

                                <Textarea
                                    value = {repoSettings?.globalInstruction}
                                    onChange={(e) => setRepoSettings({...repoSettings, globalInstruction:e.target.value})}
                                    placeholder="Example: Always login before testing protected routes. Validate toast messages and page redirects..."
                                    className="
                                mt-3
                                min-h-36
                                rounded-xl
                                border-gray-200
                                focus:ring-2
                                focus:ring-violet-500
                            "
                                />

                                <p className="mt-2 text-xs text-gray-500">
                                    These instructions will be appended to every AI-generated test case.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">

                    <Button
                        variant="outline"
                        className="rounded-xl"
                    >
                        Cancel
                    </Button>

                    <Button
                        className="
                    rounded-xl
                    px-6
                    bg-linear-to-r
                    from-indigo-600
                    via-violet-600
                    to-purple-600
                    hover:from-indigo-700
                    hover:via-violet-700
                    hover:to-purple-700
                "
                    onClick={handleSaveSettings}
                    >
                        Save Config
                    </Button>

                </div>

            </DialogContent>
        </Dialog>
    )
}

export default RepoSettings