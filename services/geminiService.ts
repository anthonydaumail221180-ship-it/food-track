
import { Type } from "@google/genai";
import { ai } from "./aiClient";
import { FoodTruck, SocialPost, Notification, MenuItem, QuizQuestion, AgentUpdate, TrendItem } from "../types";


// --- MOCK DATA GENERATORS (Fallback for Quota Exceeded) ---

const getMockTrucks = (): FoodTruck[] => [
    { 
      id: '1', 
      name: 'Gromper King', 
      cuisine: 'Luxembourgeois', 
      description: 'Les meilleures Gromperekichelcher de la ville.', 
      locationName: 'Place Guillaume II', 
      coordinates: { lat: 49.6103, lng: 6.1296 },
      rating: 4.8, 
      isOpen: true 
    },
    { 
      id: '2', 
      name: 'Taco Lux', 
      cuisine: 'Mexicain', 
      description: 'Tacos épicés et authentiques.', 
      locationName: 'Gare Centrale', 
      coordinates: { lat: 49.6000, lng: 6.1333 },
      rating: 4.5, 
      isOpen: true 
    },
    { 
      id: '3', 
      name: 'Burger Bros', 
      cuisine: 'Américain', 
      description: 'Smash burgers avec viande locale.', 
      locationName: 'Kirchberg', 
      coordinates: { lat: 49.6250, lng: 6.1600 },
      rating: 4.7, 
      isOpen: false 
    },
    { 
      id: '4', 
      name: 'Asia Express', 
      cuisine: 'Asiatique', 
      description: 'Nouilles sautées et dim sum.', 
      locationName: 'Glacis', 
      coordinates: { lat: 49.6150, lng: 6.1250 },
      rating: 4.2, 
      isOpen: true 
    }
];

// Agent 1: The Data Updater
export const fetchFoodTrucksAgent = async (): Promise<{ trucks: FoodTruck[], sources: string[] }> => {
  try {
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Trouve une liste de food trucks actuellement actifs au Luxembourg (Ville, Kirchberg, Esch). Cherche sur des sites comme editus.lu ou vdl.lu.",
      config: { tools: [{ googleSearch: {} }] }
    });

    const searchContext = searchResponse.text || "";
    const sources = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => c.web?.uri)
        .filter((u: string) => u) || [];
    
    const uniqueSources = [...new Set(sources)] as string[];

    const jsonResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Tu es un extracteur de données. Utilise le texte suivant pour générer une liste JSON de food trucks au Luxembourg.
      Texte Source: "${searchContext}"
      Règles: Extrais au moins 5 camions. Si le texte en a moins, ajoute des populaires réalistes.
      Sortie strictement JSON valide.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              cuisine: { type: Type.STRING },
              description: { type: Type.STRING },
              locationName: { type: Type.STRING },
              coordinates: {
                type: Type.OBJECT,
                properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } }
              },
              rating: { type: Type.NUMBER },
              isOpen: { type: Type.BOOLEAN }
            },
            required: ["id", "name", "cuisine", "locationName", "rating", "coordinates"]
          }
        }
      }
    });

    const text = jsonResponse.text;
    const trucks = text ? JSON.parse(text) as FoodTruck[] : [];
    return { trucks: trucks.length > 0 ? trucks : getMockTrucks(), sources: uniqueSources };

  } catch (error) {
    console.error("Quota exceeded or API error, using mock data");
    return { trucks: getMockTrucks(), sources: [] };
  }
};

// Agent 2: The Social/Influencer Agent
export const fetchInfluencerPostsAgent = async (): Promise<SocialPost[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Génère 3 posts de réseaux sociaux (TikTok/Instagram) sur la street food au Luxembourg.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              author: { type: Type.STRING },
              content: { type: Type.STRING },
              platform: { type: Type.STRING, enum: ["tiktok", "instagram"] },
              videoUrl: { type: Type.STRING },
              views: { type: Type.NUMBER },
              likes: { type: Type.NUMBER }
            },
            required: ["id", "author", "content", "platform", "views", "likes"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text");
    const raw = JSON.parse(text);
    return raw.map((p: any) => ({
        ...p,
        isInfluencer: true,
        timestamp: "Aujourd'hui",
        imageUrl: `https://picsum.photos/seed/${p.id}/400/600`
    }));
  } catch (error) {
    return [
        {
            id: 'vid1',
            author: 'LuxFoodie',
            content: 'Les burgers chez Burger Bros sont dingues ! 🍔🔥 #Luxembourg #FoodTruck',
            platform: 'tiktok',
            videoUrl: 'https://tiktok.com',
            views: 12500,
            likes: 1200,
            isInfluencer: true,
            timestamp: "Aujourd'hui",
            imageUrl: 'https://picsum.photos/seed/vid1/400/600'
        },
        {
            id: 'vid2',
            author: 'MarcMange',
            content: 'Découverte du jour : Gromper King au marché ! 🥔🇱🇺',
            platform: 'instagram',
            views: 3200,
            likes: 450,
            isInfluencer: true,
            timestamp: "Il y a 2h",
            imageUrl: 'https://picsum.photos/seed/vid2/400/600'
        }
    ];
  }
};

// Agent 3: Transport & Context Agent
export const getTransportAdvice = async (userLat: number, userLng: number, destination: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Je suis à ${userLat}, ${userLng}. Je veux aller à ${destination} Luxembourg. Quel bus prendre ? Court.`,
      config: { tools: [{ googleMaps: {} }] }
    });
    return response.text || "Consultez Mobiliteit.lu";
  } catch (error) {
    return "Consultez l'application Mobiliteit.lu pour les horaires en temps réel.";
  }
};

// Agent 4: Vote Encourager
export const getVoteEncouragement = async (leaderName: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Une phrase hype pour dire de voter pour ${leaderName} avant la fin de la semaine.`
        });
        return response.text || "Votez vite !";
    } catch (e) {
        return "C'est serré ! Votez pour votre favori maintenant.";
    }
}

// Agent 5: Profile & Menu Generator
export const fetchTruckMenuAgent = async (truckName: string, cuisine: string): Promise<MenuItem[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Crée un menu pour "${truckName}" (${cuisine}). 4 articles avec prix EUR. JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            price: { type: Type.STRING }
                        },
                        required: ["name", "price"]
                    }
                }
            }
        });
        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text) as MenuItem[];
    } catch (e) {
        return [
            { name: "Menu Signature", description: "Le classique de la maison.", price: "14.50 €" },
            { name: "Petite Faim", description: "Idéal pour le midi.", price: "9.00 €" },
            { name: "Boisson Maison", description: "Thé glacé ou limonade.", price: "3.50 €" }
        ];
    }
}

// Agent 6: Notification Generator
export const fetchNotificationsAgent = async (): Promise<Notification[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "3 notifications courtes (Promo, Quiz, Info) pour une app food truck. JSON.",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            message: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["offer", "alert", "info", "quiz"] }
                        }
                    }
                }
            }
        });
        const text = response.text;
        if (!text) throw new Error("No text");
        const raw = JSON.parse(text);
        return raw.map((n: any) => ({ ...n, timestamp: "À l'instant", read: false }));
    } catch (e) {
        return [
            { id: 'n1', title: 'Quiz Hebdo', message: 'Tentez de gagner un burger !', type: 'quiz', timestamp: 'Maintenant', read: false },
            { id: 'n2', title: 'Happy Hour', message: '-20% au Glacis ce soir.', type: 'offer', timestamp: '15min', read: false }
        ];
    }
}

// Agent 7: Weekly Quiz Generator
export const fetchWeeklyQuizAgent = async (): Promise<QuizQuestion[]> => {
  try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `5 questions culture générale nourriture. Avec 'fact' amusant. JSON.`,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          id: { type: Type.STRING },
                          question: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          correctIndex: { type: Type.INTEGER },
                          fact: { type: Type.STRING }
                      },
                      required: ["id", "question", "options", "correctIndex", "fact"]
                  }
              }
          }
      });
      const text = response.text;
      if (!text) throw new Error("No text");
      return JSON.parse(text) as QuizQuestion[];
  } catch (e) {
      return [
          {
              id: "q1",
              question: "Quel est l'ingrédient principal du guacamole ?",
              options: ["Tomate", "Avocat", "Poivron", "Maïs"],
              correctIndex: 1,
              fact: "L'avocat est un fruit, pas un légume !"
          },
          {
              id: "q2",
              question: "D'où vient la frite ?",
              options: ["France", "Belgique", "USA", "Allemagne"],
              correctIndex: 1,
              fact: "Bien que disputé, la Belgique est souvent citée comme le berceau de la frite."
          }
      ];
  }
};

// Agent 8: Geocoding Agent
export const geocodeAddressAgent = async (address: string): Promise<{ lat: number, lng: number } | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Coordonnées lat/lng de "${address}, Luxembourg". JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } },
                    required: ["lat", "lng"]
                }
            }
        });
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
};

// Agent 9: Admin Liaison Agent
export const generateAdminUpdatesAgent = async (): Promise<AgentUpdate[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Génère 3 updates admin food truck (menu, photo, location). JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            truckName: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["menu", "photo", "location", "alert"] },
                            oldValue: { type: Type.STRING },
                            newValue: { type: Type.STRING },
                            source: { type: Type.STRING, enum: ["sms", "instagram", "email"] },
                            confidence: { type: Type.NUMBER },
                            timestamp: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["pending"] }
                        },
                        required: ["id", "truckName", "type", "newValue", "source", "confidence", "status"]
                    }
                }
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text);
    } catch (e) {
        return [
             {
                id: "u1",
                truckName: "Gromper King",
                type: "menu",
                oldValue: "",
                newValue: "Nouveau burger raclette",
                source: "instagram",
                confidence: 95,
                timestamp: "Il y a 5 min",
                status: "pending"
            },
            {
                id: "u2",
                truckName: "Taco Lux",
                type: "location",
                oldValue: "Gare",
                newValue: "Cloche d'Or (Mardi)",
                source: "sms",
                confidence: 88,
                timestamp: "Il y a 20 min",
                status: "pending"
            }
        ];
    }
}

// Agent 10: THE SCOUT AGENT (Radar - Discovery)
export const fetchRadarTrendsAgent = async (): Promise<TrendItem[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Génère 3 'Tendances Radar' pour food trucks Luxembourg (Event, Buzz, Hidden Gem). JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["event", "buzz", "hidden_gem"] },
                            source: { type: Type.STRING, enum: ["instagram", "facebook", "tiktok", "web"] },
                            date: { type: Type.STRING },
                            location: { type: Type.STRING }
                        },
                        required: ["id", "title", "description", "type", "source"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text);
    } catch (e) {
        return [
            {
                id: 't1',
                title: 'Eat It Festival',
                description: 'Le retour du festival street food aux Rotondes ce weekend !',
                type: 'event',
                source: 'facebook',
                date: 'Samedi & Dimanche',
                location: 'Rotondes'
            },
            {
                id: 't2',
                title: 'Bubble Tea Folie',
                description: 'Une nouvelle recette au taro fait fureur sur TikTok.',
                type: 'buzz',
                source: 'tiktok',
                location: 'Centre Ville'
            }
        ];
    }
}

// Agent 11: Avatar Generator (STRICT SAFETY)
export const generateAvatarAgent = async (userPrompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `Create a simple, flat vector art avatar sticker for a user of a Food Truck App called "LëtzTrack".
                        The style should be: Cute, illustrative, rounded, vibrant colors using Orange (#FF512F) and Pink (#DD2476) accents, on a pure WHITE background.
                        
                        Content Request from User: "${userPrompt}"

                        MANDATORY RULES:
                        1. Theme must be related to street food, cooking, or urban dining.
                        2. Style must be friendly, vector-art, sticker-like.

                        SAFETY FILTERS (STRICT):
                        - NO violence, weapons, blood, or gore.
                        - NO drugs, smoking, alcohol, or paraphernalia.
                        - NO sexual content, nudity, or suggestive poses.
                        - NO hate symbols, racism, or offensive imagery.
                        - If the user's request violates ANY of these, IGNORE it and generate a cute robot chef holding a spatula instead.
                        `
                    }
                ]
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Avatar generation failed (likely quota or safety)", e);
        return null;
    }
}
