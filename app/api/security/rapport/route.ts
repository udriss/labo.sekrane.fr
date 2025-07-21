import { prisma } from '@/lib/db/prisma'; // Assuming prisma is set up for database interaction
import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

interface User {
  email: string;
}

type SecurityEvent = {
  id: number;
  timestamp: Date;
  eventType: string;
  type?: string; // Optional
  user?: string; // Optional
};

export async function GET() {
  try {
    // Fetch security-related data from the database
    const users = await prisma.user.findMany();
    const events = await prisma.securityEvent.findMany();

    // Create a PDF document
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {});

    // Add content to the PDF
    doc.fontSize(20).text('Rapport de Sécurité', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Utilisateurs:', { underline: true });
    users.forEach((user: User) => {
      doc.text(`- ${user.email}`);
    });

    doc.moveDown();
    doc.fontSize(14).text('Événements de Sécurité:', { underline: true });
    events.forEach((event: SecurityEvent) => {
      doc.text(`- ${event.type} par ${event.user} à ${event.timestamp}`);
    });

    doc.end();

    // Return the PDF as a response
    const pdfBuffer = Buffer.concat(chunks);
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="rapport_securite.pdf"',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la génération du rapport de sécurité:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport de sécurité' }, { status: 500 });
  }
}
