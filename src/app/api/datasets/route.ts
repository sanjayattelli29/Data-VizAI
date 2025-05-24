import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/datasets - Get all datasets for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Get user ID from session
    const userId = session.user.id as string;
    
    // Find all datasets for this user
    const datasets = await db.collection('datasets')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching datasets' },
      { status: 500 }
    );
  }
}

// POST /api/datasets - Create a new dataset
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, columns, data } = await req.json();

    // Validate input
    if (!name || !columns || !data) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Get user ID from session
    const userId = session.user.id as string;
    
    // Create dataset
    const result = await db.collection('datasets').insertOne({
      name,
      userId: new ObjectId(userId),
      columns,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { 
        message: 'Dataset created successfully',
        datasetId: result.insertedId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the dataset' },
      { status: 500 }
    );
  }
}
