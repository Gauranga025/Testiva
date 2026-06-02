"use client";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { DialogClose } from "@radix-ui/react-dialog";
import axios from "axios";
import { Input } from "../ui/input";
import { UserDetailContext } from "@/context/UserDetailContext";
type Repo = {
  id: number;
  name: string;
  full_name: string;
  private_: boolean;
  html_url: string;
  description: string;
  userId: number;
  repoId: number;
  updated_at: string;
  language: string;
  default_branch: string;
  owner: string;
};
function RepoDialog({setRefreshPage}: {setRefreshPage: (refresh: boolean) => void}) {
  const [repoList, setRepoList] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const {userDetail} = useContext(UserDetailContext);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    GetRepoList();
  }, []);
  const GetRepoList = async () => {
    const result = await axios.get("/api/github/repos");
    const data = result.data;
    console.log(data);
    setRepoList(data);
  };
  const filteredRepoList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return repoList;

    return repoList.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [searchTerm, repoList]);

  const SaveRepoToDB = async () => {
    if (!selectedRepo) return;
    const result = await axios.post("/api/user-repo", {
      id: selectedRepo.id,
      userId: userDetail?.id,
      repoId: selectedRepo.repoId,
      name: selectedRepo.name,
      full_name: selectedRepo.full_name,
      private_: selectedRepo.private_,
      html_url: selectedRepo.html_url,
      description: selectedRepo.description,
      updated_at: selectedRepo.updated_at,
      language: selectedRepo.language,
      default_branch: selectedRepo.default_branch,
      owner: selectedRepo.owner,
    });
      console.log(result.data);
      setIsOpen(false);
      setRefreshPage(true);
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <DialogTrigger asChild>
        <Button>+ Add Repo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Search and select one of your repositories to add to the workspace
          </DialogDescription>
        </DialogHeader>
        <div>
          <Input
            placeholder="Search repositories..."
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <ul className="max-h-60 overflow-y-auto rounded-xl border mt-2">
            {filteredRepoList.map((repo) => (
              <li
                key={repo.id}
                className={`p-2 hover:bg-muted border-b cursor-pointer ${selectedRepo?.id === repo.id ? "bg-muted" : " "}`}
                onClick={() => setSelectedRepo(repo)}
              >
                {repo.full_name}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="flex gap-5">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" disabled={!selectedRepo} onClick={SaveRepoToDB}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RepoDialog;
