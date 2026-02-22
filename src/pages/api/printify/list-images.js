import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), 'public', 'images', 'Sukkah Posters');

    if (!fs.existsSync(dirPath)) {
      return new Response(JSON.stringify({ images: [], error: 'Directory not found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const files = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name));

    const images = files.map((name) => ({
      name,
      filePath: path.join('public', 'images', 'Sukkah Posters', name),
      url: `/images/${encodeURIComponent('Sukkah Posters')}/${encodeURIComponent(name)}`,
    }));

    return new Response(JSON.stringify({ images }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
