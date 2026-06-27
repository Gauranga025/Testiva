import Image from 'next/image'
import React from 'react'
import { Button } from '../ui/button'
import { Link } from 'lucide-react'



function EmptyWorkspace() {
  return (
    <div className='flex flex-col mt-10 items-center justify-center'>
        <Image src="/FolderIcon.jpeg" alt="Folder" width={70} height={70} className='mx-auto'/>
        <h2 className='font-medium text-2xl mt-5 mb-4'>No Repository Connected</h2>
        <p className='text-gray-500'>Connect your Github repository to get started with testing automation.</p>
        <Button className="mt-4"><Link className="w-4 h-4 mr-2" /> Connect Repo</Button>
    </div>
  )
}

export default EmptyWorkspace