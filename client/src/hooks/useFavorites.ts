import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const FAVORITES_STORAGE_KEY = "nivarana_favorites";

export interface FavoriteFood {
  name: string;
  category: string;
  tier: string;
  addedAt: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  }, []);

  const saveFavorites = (newFavorites: FavoriteFood[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (err) {
      console.error("Failed to save favorites:", err);
    }
  };

  const addFavorite = (food: Omit<FavoriteFood, "addedAt">) => {
    const newFavorite: FavoriteFood = {
      ...food,
      addedAt: Date.now(),
    };
    
    if (!favorites.some(f => f.name === food.name && f.tier === food.tier)) {
      const updated = [...favorites, newFavorite];
      saveFavorites(updated);
      toast({
        title: "Added to favorites",
        description: `${food.name} has been saved`,
      });
      return true;
    }
    return false;
  };

  const removeFavorite = (name: string, tier: string) => {
    const updated = favorites.filter(f => !(f.name === name && f.tier === tier));
    saveFavorites(updated);
    toast({
      title: "Removed from favorites",
      description: `${name} has been removed`,
    });
  };

  const isFavorite = (name: string, tier: string) => {
    return favorites.some(f => f.name === name && f.tier === tier);
  };

  const toggleFavorite = (food: Omit<FavoriteFood, "addedAt">) => {
    if (isFavorite(food.name, food.tier)) {
      removeFavorite(food.name, food.tier);
    } else {
      addFavorite(food);
    }
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
}

