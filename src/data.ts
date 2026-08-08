import { Field, SatelliteScene, WeatherForecast, Lesson, QuizQuestion } from './types';

export const INITIAL_FIELDS: Field[] = [
  {
    id: 'f1',
    name: 'North Sector B-12',
    crop: 'Winter Wheat',
    cropVariety: 'Winter Wheat Elite',
    area: 142.5,
    elevation: 214,
    ndvi: 0.82,
    status: 'OPTIMAL',
    coordinates: { lat: 40.015, lng: -88.243 },
    boundary: [
      { lat: 40.018, lng: -88.247 },
      { lat: 40.018, lng: -88.239 },
      { lat: 40.012, lng: -88.239 },
      { lat: 40.012, lng: -88.247 }
    ],
    backgroundUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrptR-q-n-81Ckbz6ME4HNy4X0ooBognsC43hEazLJgLHhtCs98zilvzCTJ6DAxZtOTuO_lQEOl0F7vxGBHc7fFLLqMFQrnNz8EGZBCnCdMhOV1_U7_eUNjWlBPq5NFXxE6tUi0VFnLydCvKHKFrm_SLAWo-KoZ3616PLktu5TTyU-j88VYEL-D1CdjLqTxzNPmczzTz5v3CkGIZ16ScOAYzqa34eGM8sZl8BLv0e9Ce8GMNjFDpLyaa9J3nK2Lu8dmRDmHJihnURo',
    soilPh: 6.8,
    soilNitrogen: 142,
    soilOrganicCarbon: 2.4,
    yieldProjection: 12.8,
    growthStage: 'mid',
    pestRiskScore: 18,
    owner: 'Johnathan Deere',
    surveyNumber: 'FR-9428-B'
  },
  {
    id: 'f2',
    name: 'West Pivot 04',
    crop: 'Corn (Maize)',
    cropVariety: 'Corn Hybrid XT-400',
    area: 84.2,
    elevation: 202,
    ndvi: 0.45,
    status: 'STRESSED',
    coordinates: { lat: 40.031, lng: -88.271 },
    boundary: [
      { lat: 40.034, lng: -88.275 },
      { lat: 40.034, lng: -88.267 },
      { lat: 40.028, lng: -88.267 },
      { lat: 40.028, lng: -88.275 }
    ],
    backgroundUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1UZwTUZrRtVr33Awogo9MFoxlIM_iutakWT3AyuqwGX6UZLuXhmuZWvWrPnbwTX5CWRUwN_aepWULAmxFqqY1bF8LmZkqPFyfqOZUkg4B6TGP2Lv50JkqgJ_7FhNFqx1UAbB8bG8tcCQqMqIZDWyTsTevYMQq7YaPEA4k0a5porZl_3c_kbWH2iUSpmWTOS7iIDpr7QItGFRM0mxF_vwEawIurD5Qbjwjyt1tit5RUBDaEU-1Ozuqhf3GfP7f8H_gamQHoox4V2sn',
    soilPh: 6.1,
    soilNitrogen: 82,
    soilOrganicCarbon: 1.6,
    yieldProjection: 8.4,
    growthStage: 'mid',
    pestRiskScore: 68,
    owner: 'William Sterling',
    surveyNumber: 'US-8210-C'
  },
  {
    id: 'f3',
    name: 'Hillside Vineyard',
    crop: 'Soybeans',
    cropVariety: 'Soy Gen-V',
    area: 32.1,
    elevation: 310,
    ndvi: 0.78,
    status: 'OPTIMAL',
    coordinates: { lat: 40.002, lng: -88.211 },
    boundary: [
      { lat: 40.005, lng: -88.215 },
      { lat: 40.005, lng: -88.207 },
      { lat: 39.999, lng: -88.207 },
      { lat: 39.999, lng: -88.215 }
    ],
    backgroundUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACL70ajLK4479iFYIXFLTUgJ-ymXSxOIKciFyiqMq28kLmuVwLVBg_kC0S9aAK6urN2pztmBcoePjZgkRQMAa3w8D43eOv5XqQ7FktE_6mieH4J8ncqcJ86LVBzL4jFfj0LUgsJRkSqCYgtUsmg4x1RPkWeR_aYwgqAg7tQijzIKiHYiT8mO2zvcyKUrYMQIDEloa_5oWO16xYWPQyo89HM4YhEatGMeeidHP3WNA-yMfetHPUIh9CtrNUWDZAfDgIGhjm9L7nWLN3',
    soilPh: 7.2,
    soilNitrogen: 110,
    soilOrganicCarbon: 2.1,
    yieldProjection: 4.1,
    growthStage: 'mid',
    pestRiskScore: 24,
    owner: 'Maria Rossellini',
    surveyNumber: 'IT-3129-V'
  },
  {
    id: 'f4',
    name: 'East Paddy 09',
    crop: 'Canola',
    cropVariety: 'Canola Gold-X',
    area: 210.8,
    elevation: 188,
    ndvi: 0.12,
    status: 'CRITICAL',
    coordinates: { lat: 40.048, lng: -88.225 },
    boundary: [
      { lat: 40.051, lng: -88.229 },
      { lat: 40.051, lng: -88.221 },
      { lat: 40.045, lng: -88.221 },
      { lat: 40.045, lng: -88.229 }
    ],
    backgroundUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRGHF4mcD5SyXYIRSjg-AYZGCjtcwbRhOhfEgFMnwvt0fqLXNN2BsxKwYfhZgqpTXE9GMntX9KcuGkWTALhVrJuvmnw50LS8anRi3muShRtm70_6ve4RPpsni0eG58ql7VUkirrdejxrU5QcERnuBw_rC7cwTXDsaZsuiAlFb6ApNMWPR51VVPJY00THai50OsVJJ1-3lNcIU3_MrGpIbRg9HYeLhdaUKtCEnkB59Km5e3M1XpG9qujfkzmm0_nkVhWtwQ099aZSHm',
    soilPh: 5.4,
    soilNitrogen: 45,
    soilOrganicCarbon: 0.9,
    yieldProjection: 2.2,
    growthStage: 'mid',
    pestRiskScore: 84,
    owner: 'Gurpreet Singh',
    surveyNumber: 'PB-0943-P'
  }
];

export const SATELLITE_SCENES: SatelliteScene[] = [
  {
    id: 's1',
    date: 'Oct 24, 2025',
    cloudCover: 0.4,
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByXlMHaxp-WY6qa3ofWLdlpZKToPwukRjh00ADxQaXjMwU3NEGsGXaa69qTEnQnsSb7vC00xa8kEjlYFcu1kqf3FnrVnhwYE13QLhIj0-wpdSIgNSM4DWh_y1EFlxaDrK2roaGX6IQK8fATdsNh62XFsDXfYIDSeVdmJCB9hPz8gM2BIrKH7bAI2dfPzLK2TqHuVw0WerigndNRr8Qx1OSyvLt-txzNifYI7RbCbcdRhyrkjJaKJkKB-MHjM3E1oRfoU7aR9AF6zlp'
  },
  {
    id: 's2',
    date: 'Oct 19, 2025',
    cloudCover: 12.1,
    thumbnail: ''
  },
  {
    id: 's3',
    date: 'Oct 14, 2025',
    cloudCover: 2.8,
    thumbnail: ''
  }
];

export const WEATHER_FORECAST: WeatherForecast[] = [
  { day: 'TODAY', temp: 28, condition: 'Partly Cloudy', rainProb: 12, icon: 'sun' },
  { day: 'TOMORROW', temp: 24, condition: 'Light Rain', rainProb: 68, icon: 'cloud' },
  { day: 'WEDNESDAY', temp: 26, condition: 'Clear Sky', rainProb: 5, icon: 'sunny' }
];

export const CURRICULUM: Lesson[] = [
  {
    id: 1,
    module: 'MODULE 01',
    title: 'Remote Sensing Basics',
    description: "Satellites don't just \"see\" colors like we do. They measure specific bands of light reflected from the earth's surface. To detect plant health, we primarily look at the relationship between Red Light and Near-Infrared (NIR).",
    highlightBoxes: [
      {
        title: 'RED ABSORPTION',
        content: 'Healthy chlorophyll absorbs red light for photosynthesis.',
        borderColorClass: 'border-red-500'
      },
      {
        title: 'NIR REFLECTION',
        content: 'The cellular structure of leaves scatters and reflects NIR light.',
        borderColorClass: 'border-emerald-400'
      }
    ],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQqTCRwSwRsIBpwiWSw9shlk5KvLX7DUfO69n7rGNygUsXe4eff_V1BL1yqz91LacEx2mURL6ZnZsJp9dOntFW6bUXQkLFPyLAAHoibo7s8yaEx3oHUI6INHZexU4Zle9sQeKDcNW4LKHsIybxuJO7t_mTaz0oGPkYthXUtw2cOiSRswQ2tP3zNOTAclxbxCjClbc93ewPDI18hexD07Fk2W5ig8vSRxiB4XSokmu2e7tbCnQsB1wTltBuyq2ktZOlW4UXknwz5AK9',
    imageAlt: 'Microscopic Plant leaf cross-section'
  },
  {
    id: 2,
    module: 'MODULE 02',
    title: 'Understanding NDVI',
    description: 'The Normalized Difference Vegetation Index (NDVI) is a standard index used to measure green vegetation. It ranges from -1.0 to 1.0, where positive values near 1.0 represent dense, healthy vegetation, and values close to 0 represent bare soil or stressed crops.',
    formula: {
      label: 'NDVI',
      numerator: 'NIR - RED',
      denominator: 'NIR + RED'
    },
    highlightBoxes: [
      {
        title: 'FORMULA THEORY',
        content: 'By subtracting Red from NIR and normalizing by their sum, we can separate healthy plant reflection from background soils.',
        borderColorClass: 'border-emerald-500'
      }
    ],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByXlMHaxp-WY6qa3ofWLdlpZKToPwukRjh00ADxQaXjMwU3NEGsGXaa69qTEnQnsSb7vC00xa8kEjlYFcu1kqf3FnrVnhwYE13QLhIj0-wpdSIgNSM4DWh_y1EFlxaDrK2roaGX6IQK8fATdsNh62XFsDXfYIDSeVdmJCB9hPz8gM2BIrKH7bAI2dfPzLK2TqHuVw0WerigndNRr8Qx1OSyvLt-txzNifYI7RbCbcdRhyrkjJaKJkKB-MHjM3E1oRfoU7aR9AF6zlp',
    imageAlt: 'Satellite field layout with different NDVI values'
  },
  {
    id: 3,
    module: 'MODULE 03',
    title: 'Spectral Signatures',
    description: 'Every material has a unique spectral signature reflecting different wavelengths. Healthy crops reflect heavily in NIR and absorb in Red, while water absorbs completely in NIR, and soil exhibits a linear increase across wavelengths.',
    highlightBoxes: [
      {
        title: 'WATER ABSORPTION',
        content: 'Water bodies absorb almost all NIR energy. This creates negative NDVI values.',
        borderColorClass: 'border-blue-500'
      }
    ]
  },
  {
    id: 4,
    module: 'MODULE 04',
    title: 'Chlorophyll Absorption',
    description: 'Active photosynthesis requires chlorophyll-a and chlorophyll-b. These pigments are highly sensitive to blue and red light, using them as primary power sources while reflecting green, which is why we see plants as green.'
  }
];

export const QUIZ: QuizQuestion[] = [
  {
    id: 1,
    question: 'If a field shows low Red absorption and low NIR reflection, what is the most likely state of the crop?',
    options: [
      'Optimal health with high chlorophyll content',
      'Significant stress or harvesting has occurred',
      'Recent fertilization and irrigation event',
      'Transition from vegetative to reproductive stage'
    ],
    answerIndex: 1,
    explanation: 'Low Red absorption means chlorophyll is NOT absorbing light (stressed or absent), and low NIR reflection means the leafy cell structures are collapsing or harvested. This represents high stress.'
  },
  {
    id: 2,
    question: 'What is the standard formula for NDVI?',
    options: [
      '(RED - NIR) / (RED + NIR)',
      '(NIR - RED) / (NIR + RED)',
      'NIR / RED',
      'RED - NIR'
    ],
    answerIndex: 1,
    explanation: 'NDVI is calculated by subtracting Red from NIR and dividing by their sum: (NIR - RED) / (NIR + RED).'
  },
  {
    id: 3,
    question: 'Which band does healthy green vegetation reflect most strongly?',
    options: [
      'Blue light',
      'Red light',
      'Near-Infrared (NIR)',
      'Ultraviolet (UV)'
    ],
    answerIndex: 2,
    explanation: 'Healthy cell structures inside plant leaves scatter and reflect up to 50% of incoming Near-Infrared (NIR) light, making it the strongest reflected band.'
  }
];
