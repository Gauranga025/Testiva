"use client"

import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import axios from "axios";

import { useUser } from "@clerk/nextjs";

import { UserDetailContext }
    from "@/context/UserDetailContext";

function Provider({
    children,
}: {
    children: React.ReactNode;
}) {

    const [userDetail, setUserDetail] =
        useState<any>(null);

    const { isLoaded, isSignedIn } =
        useUser();

    // Prevent multiple API calls
    const hasRun = useRef(false);

    useEffect(() => {

        if (
            !isLoaded ||
            !isSignedIn ||
            hasRun.current
        ) {
            return;
        }

        hasRun.current = true;

        CreateNewUser();

    }, [isLoaded, isSignedIn]);

    const CreateNewUser = async () => {

        try {

            const result =
                await axios.post("/api/users");

            console.log(
                "User Result:",
                result.data
            );

            setUserDetail(
                result.data?.user
            );

        } catch (err) {

            console.error(
                "API Error:",
                err
            );
        }
    };

    return (

        <UserDetailContext.Provider
            value={{
                userDetail,
                setUserDetail,
            }}
        >
            <div>
                {children}
            </div>
        </UserDetailContext.Provider>

    );
}

export default Provider;