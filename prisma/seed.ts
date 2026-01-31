import 'dotenv/config'
import { PrismaClient, UserRole, SubmissionStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // Clear existing data (in reverse order of dependencies)
    await prisma.submissionBonus.deleteMany()
    await prisma.submission.deleteMany()
    await prisma.pairingMentee.deleteMany()
    await prisma.pairing.deleteMany()
    await prisma.pointsAdjustment.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.announcement.deleteMany()
    await prisma.bonusActivity.deleteMany()
    await prisma.user.deleteMany()
    await prisma.family.deleteMany()

    console.log('🧹 Cleared existing data')

    // Create Families
    const families = await Promise.all([
        prisma.family.create({ data: { name: 'Dragon Family' } }),
        prisma.family.create({ data: { name: 'Phoenix Family' } }),
        prisma.family.create({ data: { name: 'Tiger Family' } }),
        prisma.family.create({ data: { name: 'Panda Family' } }),
    ])
    console.log(`✅ Created ${families.length} families`)

    // Create Admin User
    const admin = await prisma.user.create({
        data: {
            id: 'admin-001',
            email: 'admin@ace.umn.edu',
            name: 'ACE Admin',
            role: UserRole.ADMIN,
        },
    })
    console.log('✅ Created admin user')

    // Create Mentors (one per family)
    const mentors = await Promise.all(
        families.map((family, i) =>
            prisma.user.create({
                data: {
                    id: `mentor-${i + 1}`,
                    email: `mentor${i + 1}@umn.edu`,
                    name: `Mentor ${i + 1}`,
                    role: UserRole.MENTOR,
                    familyId: family.id,
                },
            })
        )
    )
    console.log(`✅ Created ${mentors.length} mentors`)

    // Create Mentees (2 per family)
    const mentees: Awaited<ReturnType<typeof prisma.user.create>>[] = []
    for (let i = 0; i < families.length; i++) {
        for (let j = 0; j < 2; j++) {
            const mentee = await prisma.user.create({
                data: {
                    id: `mentee-${i + 1}-${j + 1}`,
                    email: `mentee${i + 1}${j + 1}@umn.edu`,
                    name: `Mentee ${i + 1}-${j + 1}`,
                    role: UserRole.MENTEE,
                    familyId: families[i].id,
                },
            })
            mentees.push(mentee)
        }
    }
    console.log(`✅ Created ${mentees.length} mentees`)

    // Create Pairings (mentor + 2 mentees each)
    const pairings: Awaited<ReturnType<typeof prisma.pairing.create>>[] = []
    for (let i = 0; i < families.length; i++) {
        const pairing = await prisma.pairing.create({
            data: {
                familyId: families[i].id,
                mentorId: mentors[i].id,
                weeklyPoints: Math.floor(Math.random() * 50) + 10,
                totalPoints: Math.floor(Math.random() * 200) + 50,
                mentees: {
                    create: [
                        { menteeId: mentees[i * 2].id },
                        { menteeId: mentees[i * 2 + 1].id },
                    ],
                },
            },
        })
        pairings.push(pairing)
    }
    console.log(`✅ Created ${pairings.length} pairings`)

    // Create Bonus Activities
    const bonusActivities = await Promise.all([
        prisma.bonusActivity.create({
            data: {
                name: 'Study Session Photo',
                description: 'Photo of a study session together',
                points: 10,
                weekNumber: 1,
                year: 2026,
                isActive: true,
            },
        }),
        prisma.bonusActivity.create({
            data: {
                name: 'Campus Tour',
                description: 'Photo at a campus landmark',
                points: 15,
                weekNumber: 1,
                year: 2026,
                isActive: true,
            },
        }),
        prisma.bonusActivity.create({
            data: {
                name: 'Food Adventure',
                description: 'Photo trying new food together',
                points: 10,
                weekNumber: 2,
                year: 2026,
                isActive: true,
            },
        }),
    ])
    console.log(`✅ Created ${bonusActivities.length} bonus activities`)

    // Create Sample Submissions
    const submissions = await Promise.all([
        prisma.submission.create({
            data: {
                pairingId: pairings[0].id,
                submitterId: mentors[0].id,
                weekNumber: 1,
                year: 2026,
                imageUrl: 'https://placeholder.com/photo1.jpg',
                imagePath: 'submissions/photo1.jpg',
                status: SubmissionStatus.APPROVED,
                reviewerId: admin.id,
                reviewedAt: new Date(),
                basePoints: 20,
                bonusPoints: 10,
                totalPoints: 30,
            },
        }),
        prisma.submission.create({
            data: {
                pairingId: pairings[1].id,
                submitterId: mentors[1].id,
                weekNumber: 1,
                year: 2026,
                imageUrl: 'https://placeholder.com/photo2.jpg',
                imagePath: 'submissions/photo2.jpg',
                status: SubmissionStatus.PENDING,
                basePoints: 20,
                bonusPoints: 0,
                totalPoints: 20,
            },
        }),
        prisma.submission.create({
            data: {
                pairingId: pairings[2].id,
                submitterId: mentees[4].id,
                weekNumber: 1,
                year: 2026,
                imageUrl: 'https://placeholder.com/photo3.jpg',
                imagePath: 'submissions/photo3.jpg',
                status: SubmissionStatus.REJECTED,
                reviewerId: admin.id,
                reviewReason: 'Image does not clearly show meetup activity',
                reviewedAt: new Date(),
                basePoints: 0,
                bonusPoints: 0,
                totalPoints: 0,
            },
        }),
    ])
    console.log(`✅ Created ${submissions.length} submissions`)

    // Create Announcements
    const announcements = await Promise.all([
        prisma.announcement.create({
            data: {
                title: 'Welcome to ACE Spring 2026!',
                content:
                    'Welcome to the ACE mentorship program! We are excited to have you join us this semester. Please make sure to submit your weekly meetup photos.',
                authorId: admin.id,
                isPublished: true,
                isPinned: true,
                publishedAt: new Date(),
            },
        }),
        prisma.announcement.create({
            data: {
                title: 'Week 1 Bonus: Campus Tour',
                content:
                    'This week, earn 15 bonus points by taking a photo at any campus landmark with your mentor/mentee!',
                authorId: admin.id,
                isPublished: true,
                isPinned: false,
                publishedAt: new Date(),
            },
        }),
        prisma.announcement.create({
            data: {
                title: 'Upcoming Family Mixer Event',
                content:
                    'Join us for the family mixer event on February 15th at Coffman Union. Food and games will be provided!',
                authorId: admin.id,
                isPublished: false,
                isPinned: false,
                scheduledFor: new Date('2026-02-10'),
            },
        }),
    ])
    console.log(`✅ Created ${announcements.length} announcements`)

    console.log('🌱 Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
