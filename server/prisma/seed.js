/**
 * Seed script to create demo accounts for portfolio demonstration
 * Run with: node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@123';

async function main() {
    console.log('🌱 Seeding demo accounts...\n');

    // Hash the demo password
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Create or update Demo Student
    const demoStudent = await prisma.user.upsert({
        where: { email: 'student@demo.com' },
        update: {
            password: hashedPassword,
            name: 'Demo Student',
        },
        create: {
            email: 'student@demo.com',
            password: hashedPassword,
            name: 'Demo Student',
            role: 'STUDENT',
        },
    });
    console.log('✅ Demo Student created/updated:', demoStudent.email);

    // Create or update Demo Teacher
    const demoTeacher = await prisma.user.upsert({
        where: { email: 'teacher@demo.com' },
        update: {
            password: hashedPassword,
            name: 'Demo Teacher',
        },
        create: {
            email: 'teacher@demo.com',
            password: hashedPassword,
            name: 'Demo Teacher',
            role: 'TEACHER',
        },
    });
    console.log('✅ Demo Teacher created/updated:', demoTeacher.email);

    // Create a sample exam for Demo Teacher (if none exists)
    const existingExams = await prisma.exam.findMany({
        where: { teacherId: demoTeacher.id },
    });

    if (existingExams.length === 0) {
        const sampleExam = await prisma.exam.create({
            data: {
                title: 'Sample Quiz: Web Development Basics',
                description: 'A quick quiz to test your HTML, CSS, and JavaScript knowledge.',
                duration: 10,
                isActive: true,
                teacherId: demoTeacher.id,
                questions: {
                    create: [
                        {
                            text: 'What does HTML stand for?',
                            options: JSON.stringify([
                                'Hyper Text Markup Language',
                                'High Tech Modern Language',
                                'Hyper Transfer Markup Language',
                                'Home Tool Markup Language'
                            ]),
                            correctOption: 0,
                        },
                        {
                            text: 'Which CSS property is used to change text color?',
                            options: JSON.stringify([
                                'text-color',
                                'font-color',
                                'color',
                                'text-style'
                            ]),
                            correctOption: 2,
                        },
                        {
                            text: 'Which keyword is used to declare a variable in JavaScript?',
                            options: JSON.stringify([
                                'var',
                                'let',
                                'const',
                                'All of the above'
                            ]),
                            correctOption: 3,
                        },
                        {
                            text: 'What is the correct way to write a JavaScript array?',
                            options: JSON.stringify([
                                'var colors = "red", "green", "blue"',
                                'var colors = ["red", "green", "blue"]',
                                'var colors = (1:"red", 2:"green", 3:"blue")',
                                'var colors = 1 = ("red"), 2 = ("green"), 3 = ("blue")'
                            ]),
                            correctOption: 1,
                        },
                        {
                            text: 'Which HTML tag is used for creating a hyperlink?',
                            options: JSON.stringify([
                                '<link>',
                                '<a>',
                                '<href>',
                                '<url>'
                            ]),
                            correctOption: 1,
                        },
                    ],
                },
            },
        });
        console.log('✅ Sample exam created:', sampleExam.title);
    } else {
        console.log('ℹ️  Demo teacher already has exams, skipping sample exam creation.');
    }

    console.log('\n🎉 Seeding complete!\n');
    console.log('Demo Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Student: student@demo.com / Demo@123');
    console.log('Teacher: teacher@demo.com / Demo@123');
    console.log('─────────────────────────────────────\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
