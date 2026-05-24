"use client";
import { UserDetailContext } from "@/context/UserDetailContext";
import Image from "next/image";
import React, { useContext } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import EmptyWorkspace from "./EmptyWorkspace";

function WorkspaceBody() {
  const { userDetail } = useContext(UserDetailContext); //Using context to get user details
  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-medium">Workspace Body</h2>
        <h2 className="text-blue-800 bg-blue-100 px-2 rounded-lg">
          Remaining Credits: {userDetail?.credits}
        </h2>
        {/* Displaying user credits from context */}
      </div>
      <Card className="mt-5 flex justify-between items-center p-4 border rounded-lg">
        <div className="flex items-center gap-5">
          <Image
            src="/GithubIcon.png"
            alt="Github"
            width={40}
            height={40}
            className="my-10"
          />
          <h2 className="text-xl font-semibold">
            Connect Github And Add Repository
          </h2>
        </div>
        <div>
          <Button>Install</Button>
        </div>
      </Card>
      <Card className="mt-10">
        <CardContent>
          <EmptyWorkspace />
        </CardContent>
      </Card>
    </div>
  );
}

export default WorkspaceBody;
