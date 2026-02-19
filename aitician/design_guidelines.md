# NIVARANA - Ayurvedic Diet Management Platform Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from wellness platforms like Headspace (calming aesthetics), Calm (nature-inspired design), and modern health dashboards like MyFitnessPal (data visualization) while maintaining authentic Ayurvedic visual language.

## Core Design Principles
- **Organic & Natural**: Embrace earthy, nature-inspired aesthetics reflecting Ayurvedic philosophy
- **Clarity Through Simplicity**: Information-rich without overwhelming, using visual hierarchy
- **Dynamic & Engaging**: Smooth animations and transitions create an immersive wellness journey
- **Trust & Authenticity**: Professional medical-grade interface with traditional Ayurvedic elements

## Typography System
- **Headings**: Serif font (e.g., Playfair Display) for traditional, authentic feel - weights 400, 600, 700
- **Body Text**: Clean sans-serif (e.g., Inter or Poppins) for modern readability - weights 400, 500, 600
- **Scale**: Hero titles (text-5xl to text-7xl), Section headers (text-3xl to text-4xl), Body (text-base to text-lg)

## Layout System
**Spacing Primitives**: Consistent use of Tailwind units - 4, 6, 8, 12, 16, 20, 24 for padding/margins
- Landing page sections: py-20 to py-32 for desktop, py-12 for mobile
- Dashboard cards: p-6 to p-8
- Component spacing: gap-4, gap-6, gap-8 for grids and flex layouts

## Component Library

### Landing Page Components
1. **Hero Section** (80vh): Large hero image showing Ayurvedic ingredients/nature, overlaid with headline, subtitle, and dual CTAs ("Get Started" + "Learn More") with blurred button backgrounds
2. **Features Grid** (3 columns desktop, 1 mobile): Icon + Title + Description cards showcasing dosha assessment, personalized plans, health goals
3. **How It Works**: 3-4 step timeline/process flow with illustrations
4. **Dosha Overview**: Visual introduction to Vata/Pitta/Kapha with nature-inspired icons and brief descriptions
5. **Testimonials**: 2-column grid with user quotes and subtle avatars
6. **CTA Section**: Final conversion section with email signup or direct login option
7. **Footer**: Multi-column with About, Features, Support, Social links

### Authentication
- Modal overlay design (not separate page) with form fields, social login buttons, and smooth fade-in animation
- Minimal, centered layout with brand logo and welcoming message

### Onboarding Flow
- Multi-step form with progress indicator (steps: Profile Info → BMI Calculation → Continue to Dashboard)
- Input fields for height (cm/ft), weight (kg/lbs), age with auto-calculation display of BMI and maintenance calories
- Visual feedback showing calculation results with celebratory micro-animation

### Dosha Assessment Quiz
- Clean, focused quiz interface showing one question at a time
- 0-4 rating scale using large, clickable buttons or slider
- Progress bar showing "Question X of 30"
- Smooth transitions between questions with slide/fade animations
- Categorization visible but subtle (Vata/Pitta/Kapha icons or colors per question)

### Dosha Profile Results
- **Visual Display**: Nature-inspired radial/circular visualization (NOT raw percentages) using organic shapes, leaves, or elemental symbols
- Constitution type clearly labeled: "You are Vata-Pitta" or "Pure Kapha"
- Detailed explanation panels for each dosha with expanding/collapsing sections
- Rich content describing dosha characteristics, tendencies, and recommendations
- Dual CTA buttons: "Get Balanced Diet Plan" + "Choose Health Goal"

### Dashboard
- Top bar: Welcome message, user avatar, dosha badge, quick stats (BMI, calories)
- Card-based layout showing: Dosha Profile card, Diet Plan card, Progress tracking (future), Quick actions
- Sidebar navigation with icons: Dashboard, Dosha Assessment, Food Lists, Profile, Settings

### Food List Display (Tiered System)
- **Tier Organization**: Accordion or tabbed interface showing Tier 1 (green), Tier 2 (yellow), Tier 3 (orange), Tier 4 (amber), Tier 5 (red - Avoid)
- **Food Cards**: Grid layout (3-4 columns desktop) with food name, category tag, visual dosha/health indicators
- **Filtering**: Dropdown menus for category (vegetables, grains, proteins, fruits, dairy, spices, nuts)
- **Search Bar**: Prominent search with live filtering
- **Visual Indicators**: Color-coded borders, small icons showing favorable/unfavourable effects

### Health Goal Selection
- Grid of 10 health goal cards (2 rows × 5 columns desktop, 2 columns mobile)
- Each card: Icon + Goal name + Brief description
- Hover effect with subtle scale and shadow increase
- Selected state with checkmark and border highlight

## Animations & Interactions
- **Landing Page**: Smooth parallax scrolling on hero, fade-in-up on scroll for sections
- **Transitions**: Page transitions using fade with 300ms duration
- **Quiz**: Question slide-in from right, previous slides out to left
- **Dosha Results**: Radial chart animates in with drawing effect over 2 seconds
- **Food Cards**: Subtle hover lift (translate-y-1) with shadow increase
- **Loading States**: Organic spinner or breathing pulse animation
- **Micro-interactions**: Button scale on click, input focus glow, success checkmarks

## Visual Design Patterns
- **Cards**: Rounded corners (rounded-xl), subtle shadows (shadow-md), white/off-white backgrounds
- **Buttons**: Primary (solid with gradient), Secondary (outline), rounded-lg with px-6 py-3
- **Color Coding**: Use nature-inspired hues - greens (favorable), yellows/oranges (neutral/caution), reds (avoid)
- **Backgrounds**: Subtle gradients, organic patterns, or large lifestyle images for hero sections

## Images
1. **Landing Hero**: Large, high-quality image of Ayurvedic ingredients (herbs, spices, bowls) or serene nature scene, possibly with yoga/meditation elements
2. **Features Section**: Icon illustrations or small photos representing each feature
3. **Dosha Visualizations**: Custom nature-inspired graphics (fire for Pitta, air for Vata, earth for Kapha)
4. **Dashboard**: Small background patterns or subtle textures
5. **Food Cards**: Optional small food images (if available) or category icons

## Responsive Behavior
- **Mobile**: Single-column layouts, collapsible navigation, touch-friendly targets (min 44px), bottom tab navigation for dashboard
- **Tablet**: 2-column grids, maintained spacing proportions
- **Desktop**: Full multi-column layouts, hover interactions, optimal reading widths (max-w-7xl containers)

## Accessibility
- Form labels always visible, high contrast ratios, keyboard navigation support, ARIA labels for quiz progress, screen reader friendly dosha visualizations

This design creates a premium, trustworthy wellness platform that balances modern web aesthetics with traditional Ayurvedic authenticity while maintaining clarity and usability throughout the user journey.