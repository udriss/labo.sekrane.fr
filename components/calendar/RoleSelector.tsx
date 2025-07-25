// components/calendar/RoleSelector.tsx
import React from 'react'
import { Box, Chip } from '@mui/material'
import { UserRole } from '@/types/global'

interface RoleSelectorProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
}

export function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  const roles: UserRole[] = ['TEACHER', 'LABORANTIN', 'ADMIN', 'ADMINLABO']

  const handleRoleChange = (role: UserRole) => {
    onRoleChange(role)
    localStorage.setItem('userRole', role)
  }

  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {roles.map(role => (
        <Chip 
          key={role}
          label={role} 
          color={currentRole === role ? 'primary' : 'default'} 
          onClick={() => handleRoleChange(role)} 
        />
      ))}
    </Box>
  )
}