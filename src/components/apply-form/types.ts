import { AceRole } from '@/types/index'
import {
    User,
    GraduationCap,
    Users,
    MessageCircle,
    Heart,
    ClipboardList
} from 'lucide-react'

export type FormData = {
    // Step 1 - Contact
    name: string
    pronouns: string
    email: string
    phone: string
    instagram: string
    // Step 2 - Academic
    university: string
    universityOther: string
    schoolYear: string
    majorsMinors: string
    livesOnCampus: string
    livesOnCampusOther: string
    // Step 3 - Role
    role: AceRole | ''
    // Step 4a - Family Head
    familyHeadAcknowledged: boolean
    familyHeadWhy: string
    familyHeadHowHelp: string
    familyHeadExclusions: string
    familyHeadIdentities: string
    familyHeadFamilyPrefs: string
    familyHeadConcerns: string
    // Step 4b - ACE Questions
    goals: string
    willingMultiple: string
    preferredActivities: string[]
    preferredActivitiesOther: string
    familyHeadPreference: string
    pairingPreferences: string
    pairingExclusions: string
    meetFrequency: string
    otherCommitments: string
    coreIdentities: string
    // Step 5 - Personal
    hobbies: string
    musicTaste: string
    perfectDay: string
    dreamVacation: string
    introExtroScale: number
    reachOutStyle: string
    additionalInfo: string
    // Step 6 - Final
    availableForReveal: string
    finalComments: string
    selfIntro: string
}

export const initialFormData: FormData = {
    name: '',
    pronouns: '',
    email: '',
    phone: '',
    instagram: '',
    university: 'University of Minnesota - Twin Cities',
    universityOther: '',
    schoolYear: '',
    majorsMinors: '',
    livesOnCampus: '',
    livesOnCampusOther: '',
    role: '',
    familyHeadAcknowledged: false,
    familyHeadWhy: '',
    familyHeadHowHelp: '',
    familyHeadExclusions: '',
    familyHeadIdentities: '',
    familyHeadFamilyPrefs: '',
    familyHeadConcerns: '',
    goals: '',
    willingMultiple: '',
    preferredActivities: [],
    preferredActivitiesOther: '',
    familyHeadPreference: '',
    pairingPreferences: '',
    pairingExclusions: '',
    meetFrequency: '',
    otherCommitments: '',
    coreIdentities: '',
    hobbies: '',
    musicTaste: '',
    perfectDay: '',
    dreamVacation: '',
    introExtroScale: 5,
    reachOutStyle: '',
    additionalInfo: '',
    availableForReveal: '',
    finalComments: '',
    selfIntro: '',
}

export const ACTIVITIES = [
    'Study',
    'Go out to restaurants',
    'Gym Buddy',
    'Play Sports',
    'Gaming',
    'Chill/Hangout',
    'Arts/Crafts',
    'Get drinks (Boba, matcha, etc)',
    'Outdoor activities (hiking, biking, running, etc)',
    'Shopping',
    'Raves / Parties',
    'Go to campus events',
    'Brainrot',
]

export const TOTAL_STEPS = 6

export const stepLabels = [
    'Contact',
    'Academic',
    'Role',
    'Questions',
    'Personal',
    'Final',
]

export const stepIcons = [
    User,
    GraduationCap,
    Users,
    MessageCircle,
    Heart,
    ClipboardList,
]
