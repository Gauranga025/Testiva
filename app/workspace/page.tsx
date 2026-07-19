import WorkspaceBody from '@/components/custom/WorkspaceBody'
import React, { Suspense } from 'react'

function Workspace() {
  return (
    <div className='mx-auto max-w-4xl p-10'>
      <Suspense fallback={<div>Loading...</div>}>
        <WorkspaceBody />
      </Suspense>
    </div>
  )
}

export default Workspace