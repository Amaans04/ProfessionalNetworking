import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/common/Header";
import { profile as initialProfile } from "@/lib/mockData";
import { useAppContext } from "@/context/AppContext";
import { Profile } from "@/types";

// Clone the initial profile for local mutations
const ProfileSection = () => {
  const { setCurrentPage, preferences, setPreferences } = useAppContext();
  const [profile, setProfile] = useState<Profile>({...initialProfile});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Profile>(profile);
  const [skillInput, setSkillInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(profile.profileImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track profile completeness
  const [completeness, setCompleteness] = useState({
    percentage: profile.completeness.percentage,
    completed: [...profile.completeness.completed],
    pending: [...profile.completeness.pending]
  });

  // Calculate profile completeness whenever profile changes
  useEffect(() => {
    updateProfileCompleteness();
  }, [profile]);

  const updateProfileCompleteness = () => {
    const fields = {
      "Basic Info": profile.name && profile.position && profile.location,
      "About Me": profile.about && profile.about.length > 20,
      "Skills": profile.skills && profile.skills.length >= 3,
      "Experience": profile.experience && profile.experience.length > 0,
      "Resume": profile.documents && profile.documents.length > 0,
      "Job Preferences": profile.preferences && profile.preferences.location,
    };
    
    const completed = Object.keys(fields).filter(key => fields[key as keyof typeof fields]);
    const pending = Object.keys(fields).filter(key => !fields[key as keyof typeof fields]);
    const percentage = Math.round((completed.length / Object.keys(fields).length) * 100);
    
    setCompleteness({
      percentage,
      completed,
      pending
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties
      const [parent, child] = name.split('.');
      const parentKey = parent as keyof Profile;
      
      setFormData({
        ...formData,
        [parentKey]: {
          ...(formData[parentKey] as any),
          [child]: value
        } as Profile[typeof parentKey]
      });
    } else {
      setFormData({
        ...formData,
        [name as keyof Profile]: value as any
      });
    }
  };

  const handleSkillAdd = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput("");
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name.includes('.')) {
      // Handle nested properties
      const [parent, child, subchild] = name.split('.');
      const parentKey = parent as keyof Profile;
      
      if (subchild) {
        // For handling deeply nested properties like preferences.notifications.jobs
        setFormData({
          ...formData,
          [parentKey]: {
            ...(formData[parentKey] as any),
            [child]: {
              ...(formData[parentKey] as any)[child],
              [subchild]: checked
            }
          } as Profile[typeof parentKey]
        });
      } else {
        // For handling single-level nested properties
        setFormData({
          ...formData,
          [parentKey]: {
            ...(formData[parentKey] as any),
            [child]: checked
          } as Profile[typeof parentKey]
        });
      }
    }
  };

  const handleJobTypeChange = (jobType: string, checked: boolean) => {
    const currentJobTypes = [...formData.preferences.jobTypes];
    if (checked && !currentJobTypes.includes(jobType)) {
      setFormData({
        ...formData,
        preferences: {
          ...formData.preferences,
          jobTypes: [...currentJobTypes, jobType]
        }
      });
    } else if (!checked && currentJobTypes.includes(jobType)) {
      setFormData({
        ...formData,
        preferences: {
          ...formData.preferences,
          jobTypes: currentJobTypes.filter(type => type !== jobType)
        }
      });
    }
  };

  const handleExperienceChange = (index: number, field: string, value: string) => {
    const updatedExperience = [...formData.experience];
    updatedExperience[index] = {
      ...updatedExperience[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      experience: updatedExperience
    });
  };

  const addExperienceEntry = () => {
    setFormData({
      ...formData,
      experience: [
        ...formData.experience,
        {
          company: "",
          position: "",
          period: "",
          description: ""
        }
      ]
    });
  };

  const removeExperienceEntry = (index: number) => {
    const updatedExperience = [...formData.experience];
    updatedExperience.splice(index, 1);
    
    setFormData({
      ...formData,
      experience: updatedExperience
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    
    // Also update preferences in app context for job recommendations
    setPreferences({
      ...preferences,
      location: formData.preferences.location,
      role: formData.position,
      experience: formData.skills[0] || ""
    });
    
    setEditMode(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Add the ProfileStrengthIndicator component after the current completeness tracking functionality
  // This component will replace the current Profile Completeness section

  const ProfileStrengthIndicator = ({ profile, setEditMode }) => {
    const strengthCategories = [
      { name: "Basic Information", fields: ["name", "position", "location"], icon: "ri-user-line" },
      { name: "Professional Summary", fields: ["about"], icon: "ri-file-text-line" },
      { name: "Skills", fields: ["skills"], minCount: 3, icon: "ri-tools-line" },
      { name: "Experience", fields: ["experience"], minCount: 1, icon: "ri-briefcase-line" },
      { name: "Education", fields: ["education"], icon: "ri-book-open-line" },
      { name: "Documents", fields: ["documents"], minCount: 1, icon: "ri-folder-line" },
      { name: "Profile Image", fields: ["profileImage"], icon: "ri-image-line" },
      { name: "Career Highlights", fields: ["careerHighlights"], minCount: 1, icon: "ri-medal-line" }
    ];

    const calculateCompleteness = () => {
      let completed = 0;
      let total = strengthCategories.length;
      
      strengthCategories.forEach(category => {
        const categoryCompleted = category.fields.every(field => {
          const value = field.includes('.') ? 
            field.split('.').reduce((obj, key) => obj && obj[key], profile) : 
            profile[field];
            
          if (Array.isArray(value) && category.minCount) {
            return value.length >= category.minCount;
          }
          
          return !!value;
        });
        
        if (categoryCompleted) completed += 1;
      });
      
      return Math.round((completed / total) * 100);
    };

    const completenessPercentage = calculateCompleteness();
    
    const getMissingFields = () => {
      return strengthCategories.filter(category => {
        return !category.fields.every(field => {
          const value = field.includes('.') ? 
            field.split('.').reduce((obj, key) => obj && obj[key], profile) : 
            profile[field];
            
          if (Array.isArray(value) && category.minCount) {
            return value.length >= category.minCount;
          }
          
          return !!value;
        });
      });
    };
    
    const missingFields = getMissingFields();
    
    // Determine profile strength description based on percentage
    const getStrengthDescription = (percentage) => {
      if (percentage < 25) return { text: "Just starting", color: "text-red-500" };
      if (percentage < 50) return { text: "Getting there", color: "text-yellow-500" };
      if (percentage < 75) return { text: "Almost complete", color: "text-blue-500" };
      if (percentage < 100) return { text: "Very strong", color: "text-[#2A9D8F]" };
      return { text: "All star profile!", color: "text-[#1D503A]" };
    };
    
    const strengthDesc = getStrengthDescription(completenessPercentage);

    return (
      <motion.div 
        className="card bg-white p-6 rounded-xl mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <i className="ri-shield-star-line text-[#2A9D8F] mr-2"></i>
            Profile Strength
          </h3>
          <span className={`text-sm font-medium ${strengthDesc.color}`}>
            {strengthDesc.text}
          </span>
        </div>
        
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-[#2A9D8F] bg-[#2A9D8F] bg-opacity-10">
                {completenessPercentage}% Complete
              </span>
            </div>
            <div className="text-right">
              <button 
                onClick={() => setEditMode(true)}
                className="text-xs text-[#1D503A] font-medium hover:underline"
              >
                Complete Profile
              </button>
            </div>
          </div>
          
          {/* Multi-segment progress bar */}
          <div className="flex h-2 mb-4 overflow-hidden rounded bg-gray-200">
            {strengthCategories.map((category, index) => {
              const isComplete = !missingFields.some(field => field.name === category.name);
              return (
                <motion.div
                  key={index}
                  initial={{ width: 0 }}
                  animate={{ width: `${100 / strengthCategories.length}%` }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className={`${isComplete ? 'bg-[#2A9D8F]' : 'bg-gray-300'} h-full`}
                />
              );
            })}
          </div>
        </div>
        
        {/* Missing fields section */}
        {missingFields.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Boost your profile by adding:</h4>
            <div className="space-y-1">
              {missingFields.slice(0, 3).map((field, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 * index }}
                  className="flex items-center group cursor-pointer"
                  onClick={() => setEditMode(true)}
                >
                  <i className={`${field.icon} text-gray-400 mr-2 group-hover:text-[#2A9D8F]`}></i>
                  <span className="text-sm text-gray-500 group-hover:text-gray-700">
                    {field.name}{" "}
                    <span className="text-xs text-[#2A9D8F] group-hover:underline ml-1">Add now</span>
                  </span>
                </motion.div>
              ))}
              
              {missingFields.length > 3 && (
                <div className="text-xs text-gray-500 mt-2">
                  + {missingFields.length - 3} more items to complete
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Profile completeness tips */}
        <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
          <div className="flex items-start">
            <i className="ri-lightbulb-line text-[#E9C46A] mt-0.5 mr-2"></i>
            <div>
              <p className="text-xs text-gray-700">
                <span className="font-medium">Pro tip:</span> Profiles with 100% completeness get up to 40% more views and job matches.
              </p>
              <div className="mt-2">
                <button 
                  onClick={() => setEditMode(true)}
                  className="text-xs text-[#1D503A] font-medium hover:underline flex items-center"
                >
                  Enhance profile <i className="ri-arrow-right-line ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Add the ProfileBadgesHighlights component after the ProfileStrengthIndicator component
  const ProfileBadgesHighlights = ({ profile, editMode }) => {
    return (
      <motion.div 
        className="card bg-white p-6 rounded-xl mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        {/* Badges Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <i className="ri-award-line text-[#2A9D8F] mr-2"></i>
              Achievements & Badges
            </h3>
            <span className="text-xs font-medium bg-[#1D503A] bg-opacity-10 text-[#1D503A] px-2 py-1 rounded-full">
              {profile.badges.filter(badge => badge.earned).length}/{profile.badges.length}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            {profile.badges.slice(0, 3).map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`${badge.earned 
                  ? 'bg-[#1D503A] bg-opacity-10 text-[#1D503A]' 
                  : 'bg-gray-100 text-gray-400'
                } rounded-lg p-3 flex flex-col items-center text-center`}
                whileHover={badge.earned ? { y: -5 } : {}}
              >
                <i className={`${badge.icon} text-2xl mb-1`}></i>
                <h4 className="font-medium text-sm">{badge.name}</h4>
                <div className="mt-1 w-full">
                  {badge.earned ? (
                    <span className="text-xs bg-[#1D503A] bg-opacity-20 px-1.5 py-0.5 rounded-full text-[#1D503A]">Earned</span>
                  ) : (
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-500">Locked</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          
          {profile.badges.length > 3 && (
            <div className="text-center">
              <button className="text-xs text-[#1D503A] font-medium hover:underline">
                View all {profile.badges.length} badges
              </button>
            </div>
          )}
        </div>
        
        {/* Career Highlights Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center">
              <i className="ri-star-line text-[#2A9D8F] mr-2"></i>
              Career Highlights
            </h3>
            {!editMode && (
              <button className="text-xs text-[#1D503A] font-medium hover:underline">
                <i className="ri-add-line"></i> Add
              </button>
            )}
          </div>
          
          {profile.careerHighlights && profile.careerHighlights.length > 0 ? (
            <div className="space-y-3">
              {profile.careerHighlights.map((highlight, index) => (
                <motion.div 
                  key={highlight.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start border-l-2 border-[#2A9D8F] pl-3 py-1"
                >
                  <div>
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-800">{highlight.title}</h4>
                      <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{highlight.year}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{highlight.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
              <i className="ri-award-line text-2xl text-gray-400 mb-2"></i>
              <p className="text-sm text-gray-500">Showcase your key achievements</p>
              <button className="mt-2 text-xs text-[#1D503A] font-medium hover:underline">
                Add career highlights
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Add the ProfileInsightsSection component after the ProfileBadgesHighlights component
  const ProfileInsightsSection = ({ profile }) => {
    return (
      <motion.div 
        className="card bg-white p-6 rounded-xl mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <i className="ri-ai-generate text-[#2A9D8F] mr-2"></i>
            AI Profile Insights
          </h3>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            Updated today
          </span>
        </div>
        
        {/* Career Fit Score */}
        <div className="bg-[#1D503A] bg-opacity-5 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-medium text-sm text-gray-800">Career Fit Score</h4>
              <p className="text-xs text-gray-500">Based on your profile and market trends</p>
            </div>
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#2A9D8F]">
                <span className="text-lg font-bold text-[#1D503A]">{profile.profileInsights.careerFitScore.score}%</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#1D503A] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                <i className="ri-arrow-up-line"></i>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-700">
              <span className="font-medium">Best industry match:</span> {profile.profileInsights.careerFitScore.industry}
            </p>
            
            <div>
              <p className="text-xs text-gray-700 mb-1 font-medium">Top role matches:</p>
              <div className="flex flex-wrap gap-2">
                {profile.profileInsights.careerFitScore.topMatches.map((match, index) => (
                  <div 
                    key={index} 
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs flex items-center"
                  >
                    <div className="w-4 h-4 bg-[#2A9D8F] rounded-full flex items-center justify-center text-white text-[8px] mr-1">
                      {match.score}%
                    </div>
                    <span className="text-gray-700">{match.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Personalized Recommendations */}
        <div>
          <h4 className="font-medium text-sm text-gray-800 mb-3">Personalized Recommendations</h4>
          <div className="space-y-3">
            {profile.profileInsights.recommendations.map((recommendation, index) => (
              <motion.div 
                key={recommendation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="flex items-start border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
              >
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 
                  ${recommendation.type === 'skill' ? 'bg-blue-100 text-blue-800' : 
                    recommendation.type === 'certification' ? 'bg-green-100 text-green-800' : 
                    recommendation.type === 'connection' ? 'bg-purple-100 text-purple-800' : 
                    'bg-gray-100 text-gray-800'}`}
                >
                  <i className={`
                    ${recommendation.type === 'skill' ? 'ri-code-line' : 
                      recommendation.type === 'certification' ? 'ri-file-certificate-line' : 
                      recommendation.type === 'connection' ? 'ri-team-line' : 
                      'ri-lightbulb-line'} text-sm`}
                  ></i>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-800">{recommendation.title}</h5>
                  <p className="text-xs text-gray-500 mt-1">{recommendation.reason}</p>
                  <div className="mt-2">
                    <button className="text-xs text-[#1D503A] font-medium hover:underline">
                      {recommendation.type === 'skill' ? 'Add to skills' : 
                        recommendation.type === 'certification' ? 'Explore certification' : 
                        recommendation.type === 'connection' ? 'Find connections' : 
                        'Learn more'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Skill Endorsements */}
        {profile.profileInsights.endorsements && profile.profileInsights.endorsements.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="font-medium text-sm text-gray-800 mb-3">Skill Endorsements</h4>
            <div className="flex flex-wrap gap-2">
              {profile.profileInsights.endorsements.map((endorsement, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs flex items-center"
                >
                  <span className="text-gray-700">{endorsement.skill}</span>
                  <div className="ml-1 px-1 bg-[#2A9D8F] bg-opacity-10 rounded text-[#2A9D8F] font-medium">
                    {endorsement.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header type="job-seeker" activePage="profile" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSuccess && (
          <motion.div 
            className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-6 flex items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <i className="ri-check-line text-xl mr-2"></i>
            <span>Your profile has been updated successfully!</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            {!editMode ? (
              <motion.div 
                className="card bg-white p-6 rounded-xl mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center mb-4 md:mb-0">
                    <div 
                      className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-4 cursor-pointer"
                      onClick={handleImageClick}
                    >
                      {profileImage ? (
                        <img src={profileImage} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <i className="ri-user-3-line text-4xl text-gray-500"></i>
                      )}
                      </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
                      <p className="text-gray-600">{profile.position}</p>
                      <div className="flex items-center text-gray-500 text-sm mt-1">
                        <i className="ri-map-pin-line mr-1"></i>
                        <span>{profile.location}</span>
                      </div>
                    </div>
                  </div>
                  <motion.button 
                    className="bg-[#1D503A] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </motion.button>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-2">About</h3>
                  <p className="text-gray-700">{profile.about}</p>
                </div>
                
                <div className="border-t mt-6 pt-6">
                  <h3 className="text-lg font-semibold mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <span key={index} className="bg-[#1D503A] bg-opacity-10 text-[#1D503A] px-3 py-1 rounded-full text-sm">
                          {skill}
                        </span>
                    ))}
                  </div>
                </div>
                
                <div className="border-t mt-6 pt-6">
                  <h3 className="text-lg font-semibold mb-3">Experience</h3>
                      {profile.experience.map((exp, index) => (
                    <div key={index} className={`${index < profile.experience.length - 1 ? 'border-b pb-4 mb-4' : ''}`}>
                      <h4 className="font-medium text-gray-800">{exp.company}</h4>
                      <p className="text-[#2A9D8F] font-medium">{exp.position}</p>
                      <p className="text-sm text-gray-500">{exp.period}</p>
                      <p className="text-sm text-gray-700 mt-1">{exp.description}</p>
                        </div>
                      ))}
                    </div>

                {/* ProfileBadgesHighlights moved from right sidebar to main section */}
                <div className="border-t mt-6 pt-6">
                  <ProfileBadgesHighlights profile={profile} editMode={editMode} />
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit}>
                <motion.div 
                  className="card bg-white p-6 rounded-xl mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center mb-6">
                    <div 
                      className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-4 cursor-pointer relative"
                      onClick={handleImageClick}
                    >
                      {profileImage ? (
                        <img src={profileImage} alt={formData.name} className="w-full h-full object-cover" />
                      ) : (
                        <i className="ri-user-3-line text-4xl text-gray-500"></i>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <i className="ri-camera-line text-white text-xl"></i>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                      <div>
                        <input 
                          type="text" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleInputChange}
                        className="text-xl font-bold text-gray-800 border-b border-gray-300 focus:border-[#2A9D8F] focus:outline-none pb-1 mb-1 bg-transparent"
                        placeholder="Your name"
                        />
                        <input 
                          type="text" 
                          name="position" 
                          value={formData.position} 
                          onChange={handleInputChange}
                        className="text-gray-600 border-b border-gray-300 focus:border-[#2A9D8F] focus:outline-none pb-1 mb-1 w-full bg-transparent"
                        placeholder="Your position"
                      />
                      <div className="flex items-center text-gray-500 text-sm mt-1">
                        <i className="ri-map-pin-line mr-1"></i>
                      <input 
                        type="text" 
                        name="location" 
                        value={formData.location} 
                        onChange={handleInputChange}
                          className="border-b border-gray-300 focus:border-[#2A9D8F] focus:outline-none pb-1 bg-transparent"
                          placeholder="Your location"
                      />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-2">About</h3>
                    <textarea 
                      name="about" 
                      value={formData.about} 
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F] min-h-[100px]"
                      placeholder="Tell us about yourself"
                    ></textarea>
                  </div>
                  
                  <div className="border-t mt-6 pt-6">
                    <h3 className="text-lg font-semibold mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.skills.map((skill, index) => (
                        <div key={index} className="bg-[#1D503A] bg-opacity-10 text-[#1D503A] px-3 py-1 rounded-full text-sm flex items-center">
                          {skill}
                          <button 
                            type="button"
                            onClick={() => handleSkillRemove(skill)}
                            className="ml-2 text-[#1D503A] hover:text-opacity-80"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex">
                      <input 
                        type="text" 
                        value={skillInput} 
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd())}
                        className="flex-grow border border-gray-300 rounded-l-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]"
                        placeholder="Add a skill"
                      />
                      <button 
                        type="button"
                        onClick={handleSkillAdd}
                        className="bg-[#2A9D8F] text-white px-4 py-2 rounded-r-md"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t mt-6 pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Experience</h3>
                      <button 
                        type="button"
                        onClick={addExperienceEntry}
                        className="text-[#2A9D8F] hover:underline text-sm flex items-center"
                      >
                        <i className="ri-add-line mr-1"></i> Add Experience
                      </button>
                    </div>
                    
                    {formData.experience.map((exp, index) => (
                      <div key={index} className="mb-6 border border-gray-200 rounded-md p-4 relative">
                        <button 
                          type="button"
                          onClick={() => removeExperienceEntry(index)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                        
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                            <input 
                              type="text" 
                              value={exp.company} 
                              onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]"
                              placeholder="Company name"
                            />
                          </div>
                        
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                            <input 
                              type="text" 
                              value={exp.position} 
                              onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]"
                            placeholder="Your position"
                            />
                          </div>
                        
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                          <input 
                            type="text" 
                            value={exp.period} 
                            onChange={(e) => handleExperienceChange(index, 'period', e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]"
                            placeholder="e.g. 2020 - Present"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea 
                            value={exp.description} 
                            onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]"
                            placeholder="Describe your responsibilities and achievements"
                            rows={3}
                          ></textarea>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t mt-6 pt-6 flex justify-end gap-2">
                    <button 
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="bg-[#1D503A] text-white px-6 py-2 rounded-md font-medium hover:bg-opacity-90"
                    >
                      Save Profile
                    </button>
                  </div>
                </motion.div>
              </form>
            )}

            {/* Documents Section */}
            <motion.div 
              className="card bg-white p-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold mb-4">Documents</h3>
              {profile.documents.length > 0 ? (
                profile.documents.map((doc, index) => (
                  <div key={index} className={`${index < profile.documents.length - 1 ? 'border-b pb-4 mb-4' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[#2A9D8F] bg-opacity-10 rounded-md flex items-center justify-center mr-3">
                          <i className={`${doc.icon} text-[#2A9D8F]`}></i>
                        </div>
                        <div>
                          <h4 className="font-medium">{doc.name}</h4>
                          <p className="text-xs text-gray-500">Updated {doc.lastUpdated}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-sm text-gray-600 hover:text-[#1D503A]">View</button>
                        <button className="text-sm text-gray-600 hover:text-[#1D503A]">Update</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                  <i className="ri-file-upload-line text-3xl text-gray-400 mb-2"></i>
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <button className="mt-3 bg-[#2A9D8F] text-white px-4 py-2 rounded-md text-sm">Upload Resume</button>
                </div>
              )}
            </motion.div>

            {/* Profile Insights Section moved from right sidebar to main section */}
            <motion.div 
              className="card bg-white p-6 rounded-xl mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <ProfileInsightsSection profile={profile} />
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            {/* AI Resume Preview - Enhanced to AI Resume Builder */}
            <motion.div 
              className="card bg-white p-6 mb-6 rounded-xl border-2 border-[#2A9D8F] shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <i className="ri-ai-generate text-[#2A9D8F] mr-2"></i>
                  AI Resume Builder
              </h3>
                <span className="bg-[#2A9D8F] text-white text-xs px-2 py-1 rounded-full">
                  <i className="ri-magic-line mr-1"></i> AI Powered
                </span>
              </div>
              
              <div className="bg-gradient-to-r from-[#1D503A]/5 to-[#2A9D8F]/5 rounded-lg p-4 mb-4">
                <div className="flex items-start mb-3">
                  <div className="bg-[#2A9D8F]/10 rounded-lg p-2 mr-3">
                    <i className="ri-file-text-line text-[#2A9D8F] text-xl"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Smart Resume Generator</h4>
                    <p className="text-xs text-gray-600 mt-1">Our AI analyzes your profile to create a professionally formatted resume tailored to your industry.</p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-md bg-white overflow-hidden shadow-sm">
                <div className="bg-[#1D503A] text-white px-4 py-2 flex justify-between items-center">
                  <div className="flex items-center">
                    <i className="ri-file-text-line mr-2"></i>
                    <span className="font-medium">Resume Preview</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50">
                <div className="text-center mb-4 pb-3 border-b">
                  <h4 className="font-bold text-lg">{profile.name || "Your Name"}</h4>
                  <p className="text-sm text-gray-600">{profile.position || "Your Position"}</p>
                  <div className="flex justify-center items-center mt-1 text-xs text-gray-500">
                    <span>{profile.location || "Location"}</span>
                    <span className="mx-2">•</span>
                    <span>{profile.name ? profile.name.toLowerCase().replace(' ', '.')+'@example.com' : "email@example.com"}</span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <h5 className="font-medium text-xs uppercase tracking-wider text-gray-500 mb-1">Skills</h5>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.length > 0 ? (
                      <>
                        {profile.skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">{skill}</span>
                        ))}
                        {profile.skills.length > 3 && (
                          <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">+{profile.skills.length - 3} more</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Add skills to see them here</span>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <h5 className="font-medium text-xs uppercase tracking-wider text-gray-500 mb-1">Experience</h5>
                  <div className="text-xs">
                    {profile.experience.length > 0 ? (
                      profile.experience.map((exp, index) => (
                        <div key={index} className={index > 0 ? 'mt-2' : ''}>
                          <p className="font-medium">{exp.company || "Company Name"} ({exp.period || "Period"})</p>
                          <p className="text-gray-600">{exp.position || "Position"}</p>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs italic">Add experience to see it here</span>
                    )}
                  </div>
                </div>
                
                  <div className="opacity-40 text-center py-2 border-t border-dashed">
                    <p className="text-xs text-gray-600">Additional sections will be tailored to your profile</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <motion.button 
                  className="text-sm bg-[#1D503A] text-white py-2 px-3 rounded-md font-medium flex items-center justify-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <i className="ri-download-line mr-2"></i>
                  Download PDF
                </motion.button>
                <motion.button 
                  className="text-sm border border-[#2A9D8F] text-[#2A9D8F] py-2 px-3 rounded-md font-medium flex items-center justify-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <i className="ri-settings-line mr-2"></i>
                  Customize
                </motion.button>
              </div>
              
              <div className="mt-4 flex">
                <div className="flex-1 border-r px-2 flex flex-col items-center justify-center">
                  <div className="text-xs font-medium text-gray-700">ATS Optimized</div>
                  <div className="text-[#2A9D8F] flex items-center mt-1">
                    <i className="ri-checkbox-circle-fill mr-1"></i>
                    <span className="text-xs">92% Match</span>
                  </div>
                </div>
                <div className="flex-1 border-r px-2 flex flex-col items-center justify-center">
                  <div className="text-xs font-medium text-gray-700">Industry Aligned</div>
                  <div className="text-[#2A9D8F] flex items-center mt-1">
                    <i className="ri-checkbox-circle-fill mr-1"></i>
                    <span className="text-xs">Tech</span>
                  </div>
                </div>
                <div className="flex-1 px-2 flex flex-col items-center justify-center">
                  <div className="text-xs font-medium text-gray-700">Templates</div>
                  <div className="text-[#2A9D8F] flex items-center mt-1">
                    <span className="text-xs">4 Available</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <div className="flex items-start">
                  <i className="ri-lightbulb-flash-line text-yellow-500 mt-0.5 mr-2 flex-shrink-0"></i>
                  <div>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Pro tip:</span> Adding more skills and detailed work descriptions helps our AI create a stronger resume.
                    </p>
                    {!profile.documents || profile.documents.length === 0 ? (
                      <div className="mt-2">
                        <button className="text-xs text-[#1D503A] font-medium hover:underline flex items-center">
                          Complete your profile <i className="ri-arrow-right-line ml-1"></i>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Job Preferences */}
            <motion.div 
              className="card bg-white p-6 mb-6 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <i className="ri-settings-line text-[#2A9D8F] mr-2"></i>
                Job Preferences
              </h3>
              
              {!editMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Location</h4>
                    <span className="text-sm text-gray-600">{profile.preferences.location || "Not set"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Job Types</h4>
                    <div className="text-sm text-gray-600">
                      {profile.preferences.jobTypes.length > 0 ? 
                        profile.preferences.jobTypes.join(", ") : 
                        "Not set"
                      }
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Salary Range</h4>
                    <span className="text-sm text-gray-600">
                      {profile.preferences.salaryRange.min && profile.preferences.salaryRange.max ? 
                        `${profile.preferences.salaryRange.min} - ${profile.preferences.salaryRange.max}` : 
                        "Not set"
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <motion.button 
                      className="bg-[#2A9D8F] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEditMode(true)}
                    >
                      Update Preferences
                    </motion.button>
                  </div>
                </div>
              ) : (
                // Edit mode for preferences included in the main form
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Location Preference</h4>
                    <div className="flex items-center">
                      <select 
                        name="preferences.location"
                        value={formData.preferences.location}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]"
                      >
                        <option value="">Select location preference</option>
                        <option value="Remote">Remote</option>
                        <option value="San Francisco, CA">San Francisco, CA</option>
                        <option value="New York, NY">New York, NY</option>
                        <option value="Seattle, WA">Seattle, WA</option>
                        <option value="Any Location">Any Location</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Job Type</h4>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]" 
                          checked={formData.preferences.jobTypes.includes("Full-time")}
                          onChange={(e) => handleJobTypeChange("Full-time", e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">Full-time</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]" 
                          checked={formData.preferences.jobTypes.includes("Part-time")}
                          onChange={(e) => handleJobTypeChange("Part-time", e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">Part-time</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]" 
                          checked={formData.preferences.jobTypes.includes("Contract")}
                          onChange={(e) => handleJobTypeChange("Contract", e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">Contract</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Salary Range</h4>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        name="preferences.salaryRange.min"
                        value={formData.preferences.salaryRange.min}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]" 
                        placeholder="Min"
                      />
                      <span className="text-gray-500">-</span>
                      <input 
                        type="text" 
                        name="preferences.salaryRange.max"
                        value={formData.preferences.salaryRange.max}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]" 
                        placeholder="Max"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Notify me about</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          name="preferences.notifications.jobs" 
                          checked={formData.preferences.notifications.jobs}
                          onChange={handleCheckboxChange}
                          className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]" 
                        />
                        <span className="ml-2 text-sm text-gray-700">New matching jobs</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          name="preferences.notifications.status"
                          checked={formData.preferences.notifications.status}
                          onChange={handleCheckboxChange}
                          className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]" 
                        />
                        <span className="ml-2 text-sm text-gray-700">Application status updates</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          name="preferences.notifications.messages"
                          checked={formData.preferences.notifications.messages}
                          onChange={handleCheckboxChange}
                          className="rounded text-[#2A9D8F] focus:ring-[#2A9D8F]" 
                        />
                        <span className="ml-2 text-sm text-gray-700">Recruiter messages</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Profile Strength Indicator remains in the right sidebar */}
            <ProfileStrengthIndicator profile={profile} setEditMode={setEditMode} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSection;
