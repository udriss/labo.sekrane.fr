"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox
} from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"


export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      rememberMe: rememberMe.toString()
    })
    
    setLoading(false)
    if (res?.error) {
      setError("Identifiants invalides")
    } else {
      window.location.href = "/"
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(120deg, #4e4e4eff 60%, #64748b 100%)",
        position: "relative"
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backdropFilter: "blur(12px)",
          background: "rgba(30, 41, 59, 0.55)",
          zIndex: 1,
          animation: "fadein 1.2s"
        }}
      />
      <Container maxWidth="md" sx={{ position: "relative", zIndex: 2 }}>
        <Paper elevation={12} sx={{
          p: 4,
          borderRadius: 6,
          background: "rgba(255, 255, 255, 1)",
          boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.18)",
          position: "relative"
        }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2, position: "relative" }}>
            {/* Background image behind the title */}
            <img
                src="/logo_2.png"
                alt="Labo Logo"
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -40%)",
                    width: '100%',
                    height: "auto",
                    opacity: 0.13,
                    zIndex: 0,
                    pointerEvents: "none",
                    filter: "drop-shadow(0 2px 8px #64748b)"
                }}
            />
            {/* Title in front */}
            <Typography
                variant="h4"
                align="center"
                fontWeight={700}
                gutterBottom
                sx={{
                    letterSpacing: 1,
                    position: "relative",
                    zIndex: 1
                }}
            >
                Espace Laboratoire
            </Typography>
        </Box>
          <Typography variant="body2" align="center" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            Connectez-vous avec votre compte administrateur ou enseignant.<br />
            <span style={{ color: "#64748b", fontWeight: 500 }}>Accès sécurisé</span>
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Stack spacing={3}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                fullWidth
                required
                autoFocus
                autoComplete="email"
                variant="filled"
                sx={{ background: "rgba(255,255,255,0.7)", borderRadius: 2, boxShadow: "0 2px 8px rgba(100,116,139,0.08)" }}
              />
              <TextField
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                variant="filled"
                sx={{ background: "rgba(255,255,255,0.7)", borderRadius: 2, boxShadow: "0 2px 8px rgba(100,116,139,0.08)" }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    name="rememberMe"
                    color="primary"
                  />
                }
                label="Se souvenir de moi"
                sx={{ alignSelf: 'flex-start' }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ fontWeight: 700, py: 1.5, borderRadius: 2, boxShadow: "0 4px 16px 0 rgba(31,38,135,0.17)", letterSpacing: 1, background: "linear-gradient(90deg, #64748b 0%, #1e293b 100%)" }}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </Stack>
          </Box>
        </Paper>
        <Typography align="center" color="text.secondary" sx={{ mt: 4, opacity: 0.7, fontSize: 13 }}>
          © {new Date().getFullYear()} LIMS - Gestion de laboratoire scolaire
        </Typography>
      </Container>
      <style>{`
        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </Box>
  )
}
