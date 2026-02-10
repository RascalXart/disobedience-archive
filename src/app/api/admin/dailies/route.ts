import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DAILIES_PATH = path.join(process.cwd(), 'src/data/dailies.json')

export async function GET() {
  const data = JSON.parse(fs.readFileSync(DAILIES_PATH, 'utf8'))
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const dailies = await request.json()
  fs.writeFileSync(DAILIES_PATH, JSON.stringify(dailies, null, 2) + '\n')
  return NextResponse.json({ ok: true, count: dailies.length })
}
