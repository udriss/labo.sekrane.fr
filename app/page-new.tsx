"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { CircularProgress, Box } from "@mui/material";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      // Not logged in, redirect to login
      router.push('/auth/signin');
      return;
    }

    // Check if user has a preferred discipline
    const preferredDiscipline = localStorage.getItem('preferredDiscipline');
    
    if (preferredDiscipline === 'chemistry' || preferredDiscipline === 'physics') {
      // Redirect to appropriate dashboard
      router.push(`/dashboard?discipline=${preferredDiscipline}`);
    } else {
      // No preference set, go to discipline selector
      router.push('/choose-discipline');
    }
  }, [session, status, router]);

  // Show loading while determining where to redirect
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
    >
      <CircularProgress />
    </Box>
  );
}
