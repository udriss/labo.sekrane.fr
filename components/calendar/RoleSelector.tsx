// components/calendar/RoleSelector.tsx
import React from 'react'
import { Box, Chip } from '@mui/material'

interface RoleSelectorProps {
  currentRole: 'TEACHER' | 'LABORANTIN' | 'ADMIN' | 'ADMINLABO'
  onRoleChange: (role: 'TEACHER' | 'LABORANTIN' | 'ADMIN' | 'ADMINLABO') => void
}

export function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  const roles: Array<'TEACHER' | 'LABORANTIN' | 'ADMIN' | 'ADMINLABO'> = ['TEACHER', 'LABORANTIN', 'ADMIN', 'ADMINLABO']

  const handleRoleChange = (role: typeof roles[number]) => {
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