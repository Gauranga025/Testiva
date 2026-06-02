"use client";
import { UserDetailContext } from "@/context/UserDetailContext";
import Image from "next/image";
import React, { useContext, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import EmptyWorkspace from "./EmptyWorkspace";
import axios from "axios";
import { useRouter } from "next/navigation";
import { cookies } from "next/headers";
import RepoDialog, { Repo } from "./RepoDialog";
import UserRepoList from "./UserRepoList";

export type UserRepo = {
  id: number;
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string;
  updatedAt: string;
  userId: number;
  owner: string;
  language: string;
  defaultBranch: string;
};


function WorkspaceBody() {
  //const cookieStore = await cookies();
  //const token = cookieStore.get("gh_token")?.value;
  //We are fetching the token on the client side so error, have to fetch on the server side and pass it as a prop to this component

  const { userDetail } = useContext(UserDetailContext); //Using context to get user details
  const router = useRouter();
  const [token, setToken] = useState('');
  const [userRepoList, setUserRepoList] = useState<UserRepo[]>([]);


  useEffect(() => {
    GetGithubUserToken();

  }, []);

  useEffect(() => {
    userDetail && GetUserAddedRepoList();
  }, [userDetail]);
  const GetGithubUserToken = async () => {
    const result = await axios.get("/api/github/token");
    console.log(result.data.token);
    setToken(result.data.token);
  }
  const onAddRepo = async () => {
    router.push("/api/github");
  }
  const GetUserAddedRepoList = async () => {
    const result = await axios.get('/api/user-repo?userId=' + userDetail?.id);
    setUserRepoList(result.data);
    console.log(result.data);
  };

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
          {!token ? <Button onClick={onAddRepo}>Setup </Button> : <RepoDialog setRefreshPage={(refresh: boolean) => GetUserAddedRepoList()} />}
        </div>
      </Card>


      {!userRepoList ? <Card className="mt-10">
        <CardContent>
          <EmptyWorkspace />
        </CardContent>
      </Card>
        : <UserRepoList repoList={userRepoList} />}
    </div>
  );
}

export default WorkspaceBody;
