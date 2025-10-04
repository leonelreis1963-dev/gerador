
import React from 'react';
import type { Idea } from '../types';

interface IdeaCardProps {
  idea: Idea;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea }) => {
  return (
    <div className="bg-gray-800/60 p-5 rounded-lg border border-gray-700/50 hover:border-purple-500/80 hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1">
      <h3 className="text-lg font-bold text-purple-300 mb-2">{idea.title}</h3>
      <p className="text-gray-400 text-sm">{idea.description}</p>
    </div>
  );
};
