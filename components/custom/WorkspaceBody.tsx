"use client";
import { UserDetailContext } from "@/context/UserDetailContext";
import Image from "next/image";
import React, { useContext, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import EmptyWorkspace from "./EmptyWorkspace";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import RepoDialog, { Repo } from "./RepoDialog";
import UserRepoList from "./UserRepoList";
import { Loader2 } from "lucide-react";

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
  targetDomain?: string;
  globalInstruction?: string;
};


function WorkspaceBody() {
  const { userDetail } = useContext(UserDetailContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [userRepoList, setUserRepoList] = useState<UserRepo[]>([]);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userDetail) return;

    refreshWorkspace();
}, [userDetail]);

  // Check if user just returned from OAuth callback
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      let errorMessage = `GitHub connection failed: ${oauthError}`;
      
      if (oauthError === 'github_account_already_connected') {
        errorMessage = 'This GitHub account is already connected to another user. Please use a different GitHub account or contact support.';
      }
      
      setGithubError(errorMessage);
      setIsLoadingToken(false);
    if (userDetail) {
        refreshWorkspace();
    }
    } else {
      // If no error, refetch token to get the latest state
      GetGithubUserToken();
    }
  }, [searchParams, userDetail]);

  

  const GetGithubUserToken = async () => {
    try {
      setIsLoadingToken(true);
      setGithubError(null);
      const result = await axios.get("/api/github/token");
      setToken(result.data.token);
      
      // Validate token by trying to fetch repos
      if (result.data.token) {
        try {
          const reposResult = await axios.get("/api/github/repos");
          setIsTokenValid(true);
        } catch (error: any) {
          console.log('Token validation failed:', error.message);
          setIsTokenValid(false);
          setGithubError("GitHub token is invalid or expired. Please reconnect.");
        }
      } else {
        setIsTokenValid(false);
      }
    } catch (error: any) {
      setGithubError("Failed to check GitHub connection status");
      setToken(null);
      setIsTokenValid(false);
    } finally {
      setIsLoadingToken(false);
    }
  }

  const onAddRepo = async () => {
    router.push("/api/github");
  }

  const GetUserAddedRepoList = async () => {
    if (!userDetail?.id) return;
    
    try {
      setIsLoadingRepos(true);
      const result = await axios.get('/api/user-repo?userId=' + userDetail.id);
      setUserRepoList(result.data);
    } catch (error) {
      // Error handled silently, UI shows empty state
    } finally {
      setIsLoadingRepos(false);
    }
  };

 const isGithubConnected =
     userRepoList.length > 0 || !!token;
 const shouldShowReconnect = !!token && isTokenValid === false;

 const refreshWorkspace = async () => {
    await Promise.all([
        GetGithubUserToken(),
        GetUserAddedRepoList(),
    ]);
    
    // Also trigger repo list refresh in RepoDialog by updating a timestamp or key
    // This will be handled by the RepoDialog's existing refresh mechanism
};

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-medium">Workspace Body</h2>
        <h2 className="text-blue-800 bg-blue-100 px-2 rounded-lg">
          Remaining Credits: {userDetail?.credits}
        </h2>
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
          <div>
            <h2 className="text-xl font-semibold">
              Connect Github And Add Repository
            </h2>
            {githubError && (
              <p className="text-sm text-red-500 mt-1">{githubError}</p>
            )}
          </div>
        </div>
        <div>
        
          {isLoadingToken ? (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </Button>
          ) : shouldShowReconnect ? (
            <Button onClick={onAddRepo}>Reconnect GitHub</Button>
          ) : !isGithubConnected ? (
            <Button onClick={onAddRepo}>Setup</Button>
          ) : (
            <RepoDialog setRefreshPage={refreshWorkspace} existingRepos={userRepoList} />
          )}
        </div>
      </Card>

      {isLoadingRepos ? (
        <Card className="mt-10">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : !userRepoList || userRepoList.length === 0 ? (
        <Card className="mt-10">
          <CardContent>
            <EmptyWorkspace />
          </CardContent>
        </Card>
      ) : (
        <UserRepoList repoList={userRepoList} setReload={() => GetUserAddedRepoList()} />
      )}
    </div>
  );
}

export default WorkspaceBody;
