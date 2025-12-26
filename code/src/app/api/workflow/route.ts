import { NextResponse } from 'next/server';
import { start } from "workflow/api"
import { processWorkflow } from './use-do-something';


// curl -X POST http://localhost:3000/api/workflow
export async function POST() {
  try {
    const res = await start(processWorkflow);
    const values = await res.returnValue; // wait for workflow to complete
    return NextResponse.json({ success: true, result: values });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
