'use client';

import { useState } from 'react';

export default function ContactFormButton() {
  const [disabled, setDisabled] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setDisabled(true);
    setTimeout(() => setDisabled(false), 300);
  };

  return (
    <a
      href="https://docs.google.com/forms/d/e/1FAIpQLSchijKElE7mr1nztp8jXd2ral113cZeDOxGC8Bll3k0KepQAQ/viewform?usp=header"
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`inline-block bg-primary hover:bg-primary-hover text-white py-2 px-6 rounded shadow font-serif transition-colors ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      お問い合わせフォームを開く
    </a>
  );
}
