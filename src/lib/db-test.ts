import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { PrismaClient } from '../generated/prisma';

// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testDatabase() {
  try {
    console.log('Starting database test...');
    console.log('Database URL:', process.env.DATABASE_URL);
    console.log('Testing connection...');

    // Test the connection first
    await prisma.$connect();
    console.log('Successfully connected to the database!');

    // 1. Create a test user
    console.log('\n1. Creating a test user...');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    console.log('Created user:', user);

    // 2. Create a conversation
    console.log('\n2. Creating a conversation...');
    const conversation = await prisma.conversation.create({
      data: {
        title: 'Test Conversation',
        userId: user.id,
      },
    });
    console.log('Created conversation:', conversation);

    // 3. Create a message
    console.log('\n3. Creating a message...');
    const message = await prisma.message.create({
      data: {
        content: 'Hello, this is a test message!',
        role: 'user',
        conversationId: conversation.id,
        userId: user.id,
      },
    });
    console.log('Created message:', message);

    // 4. Read the conversation with its messages
    console.log('\n4. Reading conversation with messages...');
    const conversationWithMessages = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        messages: true,
        user: true,
      },
    });
    console.log('Conversation with messages:', conversationWithMessages);

    // 5. Update the conversation title
    console.log('\n5. Updating conversation title...');
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: 'Updated Test Conversation' },
    });
    console.log('Updated conversation:', updatedConversation);

    // 6. Delete the test data
    console.log('\n6. Cleaning up test data...');
    await prisma.message.deleteMany({
      where: { conversationId: conversation.id },
    });
    await prisma.conversation.delete({
      where: { id: conversation.id },
    });
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log('Test data cleaned up successfully!');

  } catch (error) {
    console.error('Error during database test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabase()
  .then(() => console.log('\nDatabase test completed!'))
  .catch((error) => console.error('Test failed:', error)); 