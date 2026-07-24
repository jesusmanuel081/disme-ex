import './globals.css';

export const metadata = {
  title: 'DISME EX - Sistema de Gestión',
  description: 'CRM para distribución de medicamentos de urgencia',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
