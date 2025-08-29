import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Try to find the file in the organized structure (MM_YYYY/filename)
    const publicDir = path.join(process.cwd(), 'public');
    let filePath: string | null = null;

    try {
      // First try to find in eventPDFs directory with month_year structure
      const eventPDFsDir = path.join(publicDir, 'eventPDFs');

      // List all month_year directories
      const monthDirs = await fs.readdir(eventPDFsDir);

      for (const monthDir of monthDirs) {
        const monthPath = path.join(eventPDFsDir, monthDir);
        const stat = await fs.stat(monthPath);

        if (stat.isDirectory()) {
          const potentialPath = path.join(monthPath, filename);
          try {
            await fs.access(potentialPath);
            filePath = potentialPath;
            break;
          } catch {
            // File not found in this directory, continue searching
          }
        }
      }

      // If not found in organized structure, try direct in public
      if (!filePath) {
        const directPath = path.join(publicDir, filename);
        try {
          await fs.access(directPath);
          filePath = directPath;
        } catch {
          // File not found anywhere
        }
      }
    } catch (error) {
      // Directory doesn't exist or other error, try direct path
      const directPath = path.join(publicDir, filename);
      try {
        await fs.access(directPath);
        filePath = directPath;
      } catch {
        // File not found
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read and serve the file
    const fileBuffer = await fs.readFile(filePath);
    const uint8Array = new Uint8Array(fileBuffer);

    // Set appropriate headers for PDF
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return new NextResponse(uint8Array, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
