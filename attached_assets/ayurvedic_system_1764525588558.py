import json

class AyurvedicDoshaTest:
    def __init__(self):
        self.questions = self.generate_questions()
        
    def generate_questions(self):
        """Generate 30 questions (10 for each dosha)"""
        questions = []
        
        # Vata Questions (0-9)
        vata_questions = [
            "Do you experience weak digestion, gas or constipation?",
            "Do you feel you have low stamina or intolerance for physical activity?", 
            "Do you usually have dry skin?",
            "Do you feel anxious or worried when things go wrong?",
            "Are you sensitive to cold weather?",
            "Do you find it hard to gain weight? and have a thin buidld?",
            "Do you have difficulty falling asleep or experience light sleep?",
            "Are you impatient about doing things or try to get things done quickly?",
            "Your energy levels tend to come in bursts rather than being steady throughout the day.",
            "Do you usually prefer warm environments?"
        ]
        
        # Pitta Questions (10-19)
        pitta_questions = [
            "Do you feel irritable or get angry easily?",
            "Is your skin prone to redness, rashes or acne?",
            "Do you sweat noticeably, even with minimal physical activity?",
            "Do you frequently experience acidity or heartburn?",
            "Do you tend to pass soft and loose stools?",
            "Do you have a strong appetite and can handle large meals easily?",
            "Can you recall details and information easily and have a sharp memory.",
            "Are your eyes sensitive and prone to redness?", 
            "Do you prefer cold foods and drinks?",
            "Do you often get mouth ulcers or sores?"
        ]
        
        # Kapha Questions (20-29)
        kapha_questions = [
            "Do you feel sluggish or lethargic during the day especially after waking up?",
            "Do you often experience puffiness or swelling of face?",
            "Are your movements slow and not very agile?",
            "Do you often experience stiffness or heaviness in your joints?",
            "Is there usually a mucus build up in your throat or chest?",
            "Do you tend to gain weight easily and find it hard to lose it?",
            "Does your hands and feet often feel cold?",
            "Do you experience swelling of legs due to long hours of standing or sitting?",
            "Do you become lazy or experience heaviness after meals?",
            "Do you naturally have a large and well built frame?"
        ]
        
        # Assign questions with dosha type
        for i, question in enumerate(vata_questions):
            questions.append({"text": question, "dosha": "vata", "index": i})
            
        for i, question in enumerate(pitta_questions):
            questions.append({"text": question, "dosha": "pitta", "index": i + 10})
            
        for i, question in enumerate(kapha_questions):
            questions.append({"text": question, "dosha": "kapha", "index": i + 20})
            
        return questions
    
    def get_user_responses(self):
        """Get responses from user input"""
        responses = []
        print("\n🎯 AYURVEDIC DOSHA ASSESSMENT")
        print("Rate each statement from 0-4:")
        print("0=Never, 1=Rarely, 2=Sometimes, 3=Often, 4=Always\n")
        
        for i, question in enumerate(self.questions, 1):
            while True:
                try:
                    response = int(input(f"{i}. {question['text']}\nYour answer (0-4): "))
                    if 0 <= response <= 4:
                        responses.append({
                            "question_index": question['index'],
                            "dosha": question['dosha'],
                            "score": response
                        })
                        break
                    else:
                        print("Please enter a number between 0 and 4")
                except ValueError:
                    print("Please enter a valid number")
        return responses
    
    def calculate_dosha_percentages(self, responses):
        """Calculate Vata%, Pitta%, Kapha% that sum to 100%"""
        vata_total = sum(r['score'] for r in responses if r['dosha'] == 'vata')
        pitta_total = sum(r['score'] for r in responses if r['dosha'] == 'pitta')
        kapha_total = sum(r['score'] for r in responses if r['dosha'] == 'kapha')
        
        total_score = vata_total + pitta_total + kapha_total
        
        if total_score == 0:
            return {"vata": 33, "pitta": 33, "kapha": 34}
        
        vata_percent = round((vata_total / total_score) * 100)
        pitta_percent = round((pitta_total / total_score) * 100)
        kapha_percent = 100 - vata_percent - pitta_percent
        
        return {
            "vata": vata_percent,
            "pitta": pitta_percent, 
            "kapha": kapha_percent
        }
    
    def classify_constitution(self, percentages):
        """Apply 45% threshold and classify as Single/Dual Dosha"""
        vata = percentages['vata']
        pitta = percentages['pitta']
        kapha = percentages['kapha']
        
        if vata >= 45:
            return {"type": "single", "primary": "vata"}
        elif pitta >= 45:
            return {"type": "single", "primary": "pitta"}
        elif kapha >= 45:
            return {"type": "single", "primary": "kapha"}
        else:
            doshas = [
                ("vata", vata),
                ("pitta", pitta), 
                ("kapha", kapha)
            ]
            
            doshas.sort(key=lambda x: (-x[1], x[0]))
            
            return {
                "type": "dual",
                "primary": doshas[0][0],
                "secondary": doshas[1][0]
            }


class FoodFilter:
    def __init__(self, food_data_path):
        """Load food dataset from JSON file"""
        with open(food_data_path, 'r') as f:
            data = json.load(f)
            self.foods = data['foods']
    
    def filter_balanced_diet_single_dosha(self, primary_dosha):
        """Filter foods ONLY by dosha pacification (no health goal)"""
        tier_1 = []  # Highly favourable for dosha
        tier_2 = []  # Neutral for dosha
        tier_3 = []  # Unfavourable for dosha (AVOID)
        
        for food in self.foods:
            dosha_effect = food['dosha_effects'][primary_dosha]
            
            if dosha_effect == "favourable":
                tier_1.append(food)
            elif dosha_effect == "neutral":
                tier_2.append(food)
            else:  # unfavourable
                tier_3.append(food)
        
        return {
            "tier_1": tier_1,
            "tier_2": tier_2,
            "tier_3": tier_3
        }
    
    def filter_balanced_diet_dual_dosha(self, primary_dosha, secondary_dosha):
        """Filter foods ONLY by dosha pacification for dual dosha"""
        tier_1 = []  # Favourable for both doshas
        tier_2 = []  # Favourable for primary, neutral for secondary
        tier_3 = []  # Neutral for both
        tier_4 = []  # Conflicts (good for one, bad for other)
        tier_5 = []  # Unfavourable for primary (AVOID)
        
        for food in self.foods:
            primary_effect = food['dosha_effects'][primary_dosha]
            secondary_effect = food['dosha_effects'][secondary_dosha]
            
            # TIER 5: Never harm primary dosha
            if primary_effect == "unfavourable":
                tier_5.append(food)
            
            # TIER 1: Favourable for both
            elif primary_effect == "favourable" and secondary_effect == "favourable":
                tier_1.append(food)
            
            # TIER 2: Favourable for primary, neutral for secondary
            elif primary_effect == "favourable" and secondary_effect == "neutral":
                tier_2.append(food)
            
            # TIER 3: Neutral combinations
            elif primary_effect == "neutral" or (primary_effect == "favourable" and secondary_effect == "unfavourable"):
                tier_3.append(food)
            
            else:
                tier_4.append(food)
        
        return {
            "tier_1": tier_1,
            "tier_2": tier_2,
            "tier_3": tier_3,
            "tier_4": tier_4,
            "tier_5": tier_5
        }
    
    def filter_foods_single_dosha(self, primary_dosha, health_goal):
        """Filter foods for single dosha WITH health goal"""
        tier_1 = []  # Perfect matches
        tier_2 = []  # Good compromises  
        tier_3 = []  # Neutral/No benefit
        tier_4 = []  # Conflicts
        tier_5 = []  # Harmful (AVOID)
        
        for food in self.foods:
            dosha_effect = food['dosha_effects'][primary_dosha]
            goal_effect = food['health_goal_effects'][health_goal]
            
            # TIER 5: Never harm primary dosha
            if dosha_effect == "unfavourable":
                tier_5.append(food)
            
            # TIER 1: Perfect alignment
            elif dosha_effect == "favourable" and goal_effect == "favourable":
                tier_1.append(food)
                
            # TIER 2: Good compromises
            elif (dosha_effect == "favourable" and goal_effect == "neutral") or \
                 (dosha_effect == "neutral" and goal_effect == "favourable"):
                tier_2.append(food)
                
            # TIER 3: Neutral for both
            elif dosha_effect == "neutral" and goal_effect == "neutral":
                tier_3.append(food)
                
            # TIER 4: Conflicts
            elif dosha_effect == "favourable" and goal_effect == "unfavourable":
                tier_4.append(food)
                
            else:
                tier_3.append(food)
        
        return {
            "tier_1": tier_1,
            "tier_2": tier_2,
            "tier_3": tier_3,
            "tier_4": tier_4,
            "tier_5": tier_5
        }
    
    def filter_foods_dual_dosha(self, primary_dosha, secondary_dosha, health_goal):
        """Filter foods for dual dosha WITH health goal"""
        tier_1 = []  # Perfect matches
        tier_2 = []  # Good compromises  
        tier_3 = []  # Neutral/No benefit
        tier_4 = []  # Minor conflicts
        tier_5 = []  # Major conflicts (AVOID)
        
        for food in self.foods:
            primary_effect = food['dosha_effects'][primary_dosha]
            secondary_effect = food['dosha_effects'][secondary_dosha]
            goal_effect = food['health_goal_effects'][health_goal]
            
            # TIER 5: Never harm primary dosha
            if primary_effect == "unfavourable":
                tier_5.append(food)
            
            # TIER 1: Perfect alignment
            elif (primary_effect == "favourable" and 
                  secondary_effect != "unfavourable" and 
                  goal_effect == "favourable"):
                tier_1.append(food)
                
            # TIER 2: Good compromises
            elif (primary_effect == "favourable" and secondary_effect == "favourable" and goal_effect == "neutral") or \
                 (primary_effect == "favourable" and secondary_effect == "neutral" and goal_effect == "favourable") or \
                 (primary_effect == "neutral" and secondary_effect == "favourable" and goal_effect == "favourable"):
                tier_2.append(food)
                
            # TIER 3: Neutral for all
            elif (primary_effect == "neutral" and secondary_effect == "neutral" and goal_effect == "neutral"):
                tier_3.append(food)
                
            # TIER 4: Conflicts
            elif (primary_effect == "favourable" and secondary_effect == "unfavourable") or \
                 (primary_effect == "favourable" and goal_effect == "unfavourable"):
                tier_4.append(food)
                
            else:
                tier_3.append(food)
        
        return {
            "tier_1": tier_1,
            "tier_2": tier_2,
            "tier_3": tier_3,
            "tier_4": tier_4,
            "tier_5": tier_5
        }
    
    def display_filtered_foods_balanced(self, filtered_foods, constitution_type):
        """Display filtered foods for BALANCED DIET (dosha only)"""
        print("\n" + "="*60)
        print("🍽️  BALANCED DIET RECOMMENDATIONS (Dosha Pacification)")
        print("="*60)
        
        if constitution_type == "single":
            tier_names = {
                "tier_1": "✨ TIER 1: HIGHLY RECOMMENDED (Balances your dosha)",
                "tier_2": "➖ TIER 2: NEUTRAL (Okay in moderation)",
                "tier_3": "🚫 TIER 3: AVOID (Aggravates your dosha)"
            }
        else:
            tier_names = {
                "tier_1": "✨ TIER 1: EXCELLENT (Balances both doshas)",
                "tier_2": "⭐ TIER 2: GOOD (Balances primary dosha)",
                "tier_3": "➖ TIER 3: NEUTRAL (Use in moderation)",
                "tier_4": "⚠️  TIER 4: CAUTION (May conflict with secondary dosha)",
                "tier_5": "🚫 TIER 5: AVOID (Aggravates primary dosha)"
            }
        
        for tier_key, tier_name in tier_names.items():
            if tier_key not in filtered_foods:
                continue
            foods = filtered_foods[tier_key]
            print(f"\n{tier_name}")
            print("-" * 60)
            
            if not foods:
                print("  No foods in this category")
                continue
            
            categories = {}
            for food in foods:
                cat = food['category'].title()
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(food['name'])
            
            for category, items in sorted(categories.items()):
                print(f"\n  📂 {category}:")
                for item in sorted(items):
                    print(f"     • {item}")
    
    def display_filtered_foods_health_goal(self, filtered_foods, constitution_type):
        """Display filtered foods for HEALTH GOAL (dosha + goal)"""
        print("\n" + "="*60)
        print("🍽️  PERSONALIZED FOOD RECOMMENDATIONS (Dosha + Health Goal)")
        print("="*60)
        
        tier_names = {
            "tier_1": "✨ TIER 1: PERFECT MATCHES (Highly Recommended)",
            "tier_2": "⭐ TIER 2: GOOD CHOICES (Recommended)",
            "tier_3": "➖ TIER 3: NEUTRAL (Okay in moderation)",
            "tier_4": "⚠️  TIER 4: CONFLICTS (Use with caution)",
            "tier_5": "🚫 TIER 5: AVOID (Not recommended for your dosha)"
        }
        
        for tier_key, tier_name in tier_names.items():
            if tier_key not in filtered_foods:
                continue
            foods = filtered_foods[tier_key]
            print(f"\n{tier_name}")
            print("-" * 60)
            
            if not foods:
                print("  No foods in this category")
                continue
            
            categories = {}
            for food in foods:
                cat = food['category'].title()
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(food['name'])
            
            for category, items in sorted(categories.items()):
                print(f"\n  📂 {category}:")
                for item in sorted(items):
                    print(f"     • {item}")


class AyurvedicDietSystem:
    def __init__(self, food_data_path):
        self.dosha_test = AyurvedicDoshaTest()
        self.food_filter = FoodFilter(food_data_path)
        self.health_goals = {
            "heart_health": "Heart Health",
            "gut_health": "Gut Health & Digestion",
            "inflammation": "Reduce Inflammation",
            "liver_function": "Liver Function",
            "immunity": "Boost Immunity",
            "diabetes": "Diabetes Management",
            "skin_hair": "Skin & Hair Health",
            "weight_management": "Weight Management",
            "sleep": "Better Sleep Quality",
            "energy": "Increase Energy Levels"
        }
    
    def get_user_choice(self):
        """Get user's choice: Balanced Diet or Health Goals"""
        print("\n" + "="*60)
        print("🎯 CHOOSE YOUR DIET APPROACH:")
        print("="*60)
        print("\n1. BALANCED DIET")
        print("   → Foods filtered based on dosha pacification only")
        print("   → Focus on maintaining dosha balance")
        
        print("\n2. HEALTH GOALS")
        print("   → Foods filtered based on dosha + specific health goals")
        print("   → Address specific health concerns while balancing dosha")
        
        while True:
            try:
                choice = int(input("\nEnter your choice (1 or 2): "))
                if choice == 1:
                    return "balanced"
                elif choice == 2:
                    return "health_goal"
                else:
                    print("Please enter 1 or 2")
            except ValueError:
                print("Please enter a valid number")
    
    def get_health_goal(self):
        """Get user's specific health goal"""
        print("\n" + "="*60)
        print("🎯 SELECT YOUR PRIMARY HEALTH GOAL:")
        print("="*60)
        
        goals_list = list(self.health_goals.items())
        
        for i, (key, display_name) in enumerate(goals_list, 1):
            print(f"{i}. {display_name}")
        
        while True:
            try:
                choice = int(input(f"\nEnter your choice (1-{len(goals_list)}): "))
                if 1 <= choice <= len(goals_list):
                    return goals_list[choice - 1][0]
                else:
                    print(f"Please enter a number between 1 and {len(goals_list)}")
            except ValueError:
                print("Please enter a valid number")
    
    def run(self):
        """Run the complete system"""
        print("="*60)
        print("🌿 AYURVEDIC DIET MANAGEMENT SYSTEM")
        print("="*60)
        print("\nWelcome! This system will:")
        print("1. Assess your dosha constitution")
        print("2. Let you choose between balanced diet or health goals")
        print("3. Provide personalized food recommendations\n")
        
        # Step 1: Dosha Assessment
        responses = self.dosha_test.get_user_responses()
        percentages = self.dosha_test.calculate_dosha_percentages(responses)
        constitution = self.dosha_test.classify_constitution(percentages)
        
        # Display Dosha Results
        print("\n" + "="*60)
        print("🎉 YOUR AYURVEDIC PROFILE")
        print("="*60)
        print(f"\n📊 DOSHA PERCENTAGES:")
        print(f"   • Vata:  {percentages['vata']}%")
        print(f"   • Pitta: {percentages['pitta']}%")
        print(f"   • Kapha: {percentages['kapha']}%")
        
        print(f"\n🎯 CONSTITUTION TYPE:")
        if constitution['type'] == 'single':
            print(f"   SINGLE DOSHA - {constitution['primary'].upper()} Dominant")
        else:
            print(f"   DUAL DOSHA - {constitution['primary'].upper()}-{constitution['secondary'].upper()}")
        
        # Step 2: Get User's Choice
        user_choice = self.get_user_choice()
        
        # Step 3: Filter Foods Based on Choice
        if user_choice == "balanced":
            # Balanced Diet - Filter by dosha only
            if constitution['type'] == 'single':
                filtered_foods = self.food_filter.filter_balanced_diet_single_dosha(
                    constitution['primary']
                )
            else:
                filtered_foods = self.food_filter.filter_balanced_diet_dual_dosha(
                    constitution['primary'],
                    constitution['secondary']
                )
            
            # Display Results
            self.food_filter.display_filtered_foods_balanced(filtered_foods, constitution['type'])
            
        else:
            # Health Goals - Get specific goal and filter by dosha + goal
            health_goal = self.get_health_goal()
            
            if constitution['type'] == 'single':
                filtered_foods = self.food_filter.filter_foods_single_dosha(
                    constitution['primary'], 
                    health_goal
                )
            else:
                filtered_foods = self.food_filter.filter_foods_dual_dosha(
                    constitution['primary'],
                    constitution['secondary'],
                    health_goal
                )
            
            # Display Results
            self.food_filter.display_filtered_foods_health_goal(filtered_foods, constitution['type'])
        
        print("\n" + "="*60)
        print("✨ Thank you for using the Ayurvedic Diet Management System!")
        print("="*60)


# 🚀 MAIN PROGRAM
if __name__ == "__main__":
    # Path to your food dataset JSON file
    FOOD_DATA_PATH = "food_dataset.json"
    
    try:
        system = AyurvedicDietSystem(FOOD_DATA_PATH)
        system.run()
    except FileNotFoundError:
        print("❌ Error: food_dataset.json not found!")
        print("Please ensure the food dataset file is in the same directory.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")