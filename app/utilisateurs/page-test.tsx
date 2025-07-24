"use client";

import { useState } from "react";
import { Container, Typography } from "@mui/material";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function UsersPageTest() {
  const [test] = useState("test");

  return (
    <Container>
      <Typography variant="h3">
        Test Page - {test}
      </Typography>
    </Container>
  );
}
