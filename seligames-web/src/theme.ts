import { createTheme } from '@mui/material/styles';

// Metal/Chrome color palette
const chromeColors = {
    100: '#f5f5f5',
    200: '#e0e0e0',
    300: '#bdbdbd',
    400: '#9e9e9e',
    500: '#757575',
    600: '#616161',
    700: '#424242',
    800: '#212121',
    900: '#1a1a1a',
};

const neonBlue = '#00f0ff';
const neonCyan = '#0ff';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: chromeColors[100],
            light: chromeColors[200],
            dark: chromeColors[400],
            contrastText: '#000000',
        },
        secondary: {
            main: neonBlue,
            light: neonCyan,
            dark: '#00b8cc',
            contrastText: '#000000',
        },
        background: {
            default: '#0a0a0a',
            paper: chromeColors[900],
        },
        text: {
            primary: chromeColors[100],
            secondary: chromeColors[400],
        },
        divider: 'rgba(255, 255, 255, 0.1)',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontFamily: '"Orbitron", "Inter", sans-serif',
            fontWeight: 700,
            fontSize: '3.5rem',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontFamily: '"Orbitron", "Inter", sans-serif',
            fontWeight: 700,
            fontSize: '2.75rem',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontFamily: '"Orbitron", "Inter", sans-serif',
            fontWeight: 600,
            fontSize: '2.25rem',
            lineHeight: 1.4,
        },
        h4: {
            fontFamily: '"Orbitron", "Inter", sans-serif',
            fontWeight: 600,
            fontSize: '1.75rem',
            lineHeight: 1.4,
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.5rem',
            lineHeight: 1.5,
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.25rem',
            lineHeight: 1.5,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.7,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
        },
        button: {
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
        },
    },
    spacing: 8, // Base spacing unit (8px)
    shape: {
        borderRadius: 12, // More rounded corners for modern look
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 40%),
            linear-gradient(to bottom, #0a0a0a, #121212)
          `,
                    backgroundAttachment: 'fixed',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    padding: '12px 32px',
                    fontSize: '1rem',
                    borderRadius: 12,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    },
                },
                sizeLarge: {
                    padding: '16px 40px',
                    fontSize: '1.125rem',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(26, 26, 26, 0.6)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        borderColor: 'rgba(0, 240, 255, 0.3)',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0, 240, 255, 0.15)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(26, 26, 26, 0.8)',
                    backdropFilter: 'blur(12px)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 12,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                    },
                },
            },
        },
    },
});
