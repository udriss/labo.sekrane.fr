import { useState, useEffect } from 'react';
import { Fab, Zoom, useScrollTrigger, Box } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Afficher le bouton après avoir scrollé de 100px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Zoom in={isVisible}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
      >
        <Fab 
          color="primary" 
          size="small" 
          aria-label="scroll back to top"
          sx={{
            boxShadow: 3,
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: 6,
            },
            transition: 'all 0.3s ease',
          }}
        >
          <KeyboardArrowUp />
        </Fab>
      </Box>
    </Zoom>
  );
}