import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, updateDemographics } from '../utils/session';
import { api } from '../utils/api';

const Demographics = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    age: '',
    bioExperience: '',
    chemExperience: '',
    cybersecurityExperience: '',
    background: '',
    aiSafetyExposure: '',
    programmingExperience: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  useLayoutEffect(() => {
    // Force scroll to top immediately during layout
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  
  useEffect(() => {
    
    // Check if session exists
    const session = getSession();
    if (!session) {
      navigate('/');
      return;
    }
    
    // If demographics already filled, redirect to game
    if (session.demographics) {
      const urlParams = new URLSearchParams(window.location.search);
      const gameParams = new URLSearchParams();
      
      // Preserve demo flag from session
      if (session.isDemo) {
        gameParams.set('demo', 'true');
      }
      
      // Preserve sp parameter if it exists
      const spParam = urlParams.get('sp');
      if (spParam) {
        gameParams.set('sp', spParam);
      }
      
      const gameUrl = `/${session.gameType}-game${gameParams.toString() ? '?' + gameParams.toString() : ''}`;
      navigate(gameUrl);
      return;
    }
    
    // Additional scroll to top after component mounts
    const scrollTimer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);
    
    return () => clearTimeout(scrollTimer);
  }, [navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    Object.keys(formData).forEach(key => {
      if (!formData[key]) {
        newErrors[key] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const session = getSession();
      
      // Convert string to boolean for aiSafetyExposure
      const demographicsData = {
        ...formData,
        aiSafetyExposure: formData.aiSafetyExposure === 'yes'
      };
      
      // Update local session
      updateDemographics(demographicsData);
      
      // Submit to API
      const apiResult = await api.submitDemographics(session.sessionId, demographicsData);
      
      if (!apiResult.success) {
        console.error('Demographics submission failed:', apiResult.error);
        throw new Error(apiResult.error || 'Failed to submit demographics');
      }
      
      // Navigate to appropriate game, preserving URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const gameParams = new URLSearchParams();
      
      // Preserve demo flag from session
      if (session.isDemo) {
        gameParams.set('demo', 'true');
      }
      
      // Preserve sp parameter if it exists
      const spParam = urlParams.get('sp');
      if (spParam) {
        gameParams.set('sp', spParam);
      }
      
      const gameUrl = `/${session.gameType}-game${gameParams.toString() ? '?' + gameParams.toString() : ''}`;
      navigate(gameUrl);
    } catch (error) {
      console.error('Error submitting demographics:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };
  
  const experienceLevels = ['none', 'basic', 'intermediate', 'advanced', 'expert'];
  
  return (
    <div className="max-w-600 mx-auto p-4">
      <div className="container">
        <h2 className="text-center mb-4">Step 1 of 3: Background Information</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="age">Age Range *</label>
            <select
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
            >
              <option value="">Select age range</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55+">55+</option>
            </select>
            {errors.age && <div className="error-message">{errors.age}</div>}
          </div>
          
          <div className="form-group">
            <label>Biology Experience *</label>
            <div className="radio-group">
              {experienceLevels.map(level => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="bioExperience"
                    value={level}
                    checked={formData.bioExperience === level}
                    onChange={handleChange}
                    required
                  />
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>
            {errors.bioExperience && <div className="error-message">{errors.bioExperience}</div>}
          </div>
          
          <div className="form-group">
            <label>Chemistry Experience *</label>
            <div className="radio-group">
              {experienceLevels.map(level => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="chemExperience"
                    value={level}
                    checked={formData.chemExperience === level}
                    onChange={handleChange}
                    required
                  />
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>
            {errors.chemExperience && <div className="error-message">{errors.chemExperience}</div>}
          </div>
          
          <div className="form-group">
            <label>Cybersecurity Experience *</label>
            <div className="radio-group">
              {experienceLevels.map(level => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="cybersecurityExperience"
                    value={level}
                    checked={formData.cybersecurityExperience === level}
                    onChange={handleChange}
                    required
                  />
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>
            {errors.cybersecurityExperience && <div className="error-message">{errors.cybersecurityExperience}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="background">Professional Background *</label>
            <select
              id="background"
              name="background"
              value={formData.background}
              onChange={handleChange}
              required
            >
              <option value="">Select background</option>
              <option value="student">Student</option>
              <option value="academic">Academic</option>
              <option value="industry">Industry</option>
              <option value="government">Government</option>
              <option value="other">Other</option>
            </select>
            {errors.background && <div className="error-message">{errors.background}</div>}
          </div>
          
          <div className="form-group">
            <label>Previous AI Safety Exposure *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="aiSafetyExposure"
                  value="yes"
                  checked={formData.aiSafetyExposure === 'yes'}
                  onChange={handleChange}
                  required
                />
                <span>Yes</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="aiSafetyExposure"
                  value="no"
                  checked={formData.aiSafetyExposure === 'no'}
                  onChange={handleChange}
                  required
                />
                <span>No</span>
              </label>
            </div>
            {errors.aiSafetyExposure && <div className="error-message">{errors.aiSafetyExposure}</div>}
          </div>
          
          <div className="form-group">
            <label>Programming Experience *</label>
            <div className="radio-group">
              {experienceLevels.slice(0, 4).map(level => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="programmingExperience"
                    value={level}
                    checked={formData.programmingExperience === level}
                    onChange={handleChange}
                    required
                  />
                  <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                </label>
              ))}
            </div>
            {errors.programmingExperience && <div className="error-message">{errors.programmingExperience}</div>}
          </div>
          
          {errors.submit && (
            <div className="error-message mb-3">{errors.submit}</div>
          )}
          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mr-3"
              disabled={submitting}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
            >
              {submitting ? <span className="loading"></span> : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Demographics;