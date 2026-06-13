import React from 'react';

interface FeedPageProps {
  currentSync: 'all' | 'business' | 'personal';
  userGender: 'all' | 'male' | 'female';
}

export default function FeedPage({ currentSync, userGender }: FeedPageProps) {
  return (
    <div className="p-8 text-gray-400">
      Лента-радар в разработке (Фильтр: {currentSync}, Пол: {userGender})...
    </div>
  );
}
