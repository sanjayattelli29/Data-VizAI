import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import clientPromise from '@/lib/mongodb';
import { sendEmail, generateWelcomeEmail } from '@/utils/emailService';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });    // Send welcome email
    console.log('Attempting to send welcome email to new user:', { name, email });
    const welcomeEmail = generateWelcomeEmail(name);
    const emailSent = await sendEmail({
      to: email,
      subject: 'Welcome to Data-VizAI',
      text: welcomeEmail.text,
      html: welcomeEmail.html,
    });

    if (!emailSent) {
      console.error('Failed to send welcome email to:', email);
      // We'll still create the account but let the user know about the email issue
      return NextResponse.json(
        { 
          message: 'User registered successfully but welcome email could not be sent',
          userId: result.insertedId 
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { 
        message: 'User registered successfully',
        userId: result.insertedId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
