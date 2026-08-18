-- ============================================================
-- SabraTech update 1: AI tools become database-managed.
-- Run once in the Supabase SQL Editor.
-- ============================================================

create table if not exists public.ai_tools (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  category text default 'Other',
  url text not null,
  description text default '',
  sort int default 999,
  published boolean default true
);

alter table public.ai_tools enable row level security;
create policy "public_read_ai_tools" on public.ai_tools for select using (published = true);
create policy "admin_all_ai_tools" on public.ai_tools for all to authenticated using (true) with check (true);

insert into public.ai_tools (name, category, url, description, sort) values
  ('ChatGPT', 'Chat Assistants', 'https://chatgpt.com', 'OpenAI''s chatbot — writing, research, file analysis, and image generation in one place.', 10),
  ('Claude', 'Chat Assistants', 'https://claude.ai', 'Anthropic''s assistant — excels at natural writing, long-document analysis, and coding tasks.', 20),
  ('Gemini', 'Chat Assistants', 'https://gemini.google.com', 'Google''s AI — integrated with Gmail, Docs, and Drive, connected to real-time search.', 30),
  ('Perplexity', 'Chat Assistants', 'https://perplexity.ai', 'AI-powered search engine that answers questions with cited sources — a modern Google alternative.', 40),
  ('Midjourney', 'Image Generation', 'https://midjourney.com', 'The leading artistic image generator — visual quality that''s hard to match elsewhere.', 50),
  ('Ideogram', 'Image Generation', 'https://ideogram.ai', 'Image generator that excels at text inside images — perfect for logos, posters, and marketing graphics.', 60),
  ('Leonardo.Ai', 'Image Generation', 'https://leonardo.ai', 'Image creation platform with advanced style control — popular with designers and game artists.', 70),
  ('Runway', 'Video', 'https://runwayml.com', 'AI video creation and editing — text-to-video, background removal, and advanced effects.', 80),
  ('HeyGen', 'Video', 'https://heygen.com', 'Talking avatar videos — turn text into a video with a realistic presenter, including translation.', 90),
  ('Synthesia', 'Video', 'https://synthesia.io', 'Training and corporate videos with virtual presenters — no camera, studio, or production crew.', 100),
  ('ElevenLabs', 'Audio & Music', 'https://elevenlabs.io', 'World-class text-to-speech — realistic voices in Hebrew and English, including voice cloning.', 110),
  ('Suno', 'Audio & Music', 'https://suno.com', 'Create complete songs from text — lyrics, melody, vocals, and production in one click.', 120),
  ('Jasper', 'Writing & Marketing', 'https://jasper.ai', 'Marketing writing assistant for business — campaigns, blogs, and on-brand content with a consistent voice.', 130),
  ('Copy.ai', 'Writing & Marketing', 'https://copy.ai', 'Marketing and sales content automation — emails, posts, and sales scripts at scale.', 140),
  ('Grammarly', 'Writing & Marketing', 'https://grammarly.com', 'Real-time English writing improvement — grammar, style, and tone everywhere you write.', 150),
  ('Notion AI', 'Productivity', 'https://notion.com', 'Notion''s AI — summaries, writing, and smart search inside your workspace.', 160),
  ('Otter.ai', 'Meetings & Collaboration', 'https://otter.ai', 'Automatic meeting transcription — recording, summary, and action items from every Zoom or Teams call.', 170),
  ('Gamma', 'Productivity', 'https://gamma.app', 'Presentations, documents, and websites from text — professional design in seconds, no PowerPoint.', 180),
  ('Zapier', 'Automation', 'https://zapier.com', 'Connect thousands of apps and automate workflows — now with built-in AI agents.', 190),
  ('Make', 'Automation', 'https://make.com', 'Advanced visual automation — build complex scenarios with drag-and-drop, more flexible than Zapier.', 200),
  ('Motion', 'Task Management', 'https://usemotion.com', 'AI-powered scheduling and task prioritization that builds your calendar around deadlines.', 210),
  ('Reclaim.ai', 'Task Management', 'https://reclaim.ai', 'Smart calendar assistant that schedules meetings and focus time around your availability.', 220),
  ('ClickUp', 'Task Management', 'https://clickup.com', 'AI-assisted task and project management with built-in summaries and automation.', 230),
  ('Todoist AI', 'Task Management', 'https://todoist.com', 'AI-generated task breakdowns and priority suggestions on top of the classic to-do app.', 240),
  ('Asana', 'Task Management', 'https://asana.com', 'Team project tracking with AI automation, status insights, and workflow intelligence.', 250),
  ('Rytr', 'Writing & Marketing', 'https://rytr.me', 'AI content assistant for blogs, emails, and SEO writing on a budget.', 260),
  ('Sudowrite', 'Writing & Marketing', 'https://sudowrite.com', 'AI-assisted creative writing and story development for fiction writers.', 270),
  ('Writesonic', 'Writing & Marketing', 'https://writesonic.com', 'Budget-friendly AI writing for articles, ads, and product descriptions.', 280),
  ('Canva Magic Studio', 'Design', 'https://canva.com', 'Canva''s AI suite — graphic design, social content, and image editing in one click.', 290),
  ('Visme AI', 'Design', 'https://visme.co', 'AI-powered presentation and infographic design that looks professionally made.', 300),
  ('Superhuman', 'Email & Communication', 'https://superhuman.com', 'AI-powered email prioritization and workflow acceleration for a faster inbox.', 310),
  ('MailMaestro', 'Email & Communication', 'https://maestrolabs.com', 'AI-crafted professional emails with tone adjustments, right inside Outlook and Gmail.', 320),
  ('Shortwave', 'Email & Communication', 'https://shortwave.com', 'AI-driven email management with thread summaries, smart search, and thoughtful replies.', 330),
  ('Hemingway App', 'Email & Communication', 'https://hemingwayapp.com', 'AI-enhanced writing clarity and readability analysis that flags complex sentences.', 340),
  ('Lavender', 'Email & Communication', 'https://lavender.ai', 'AI-assisted cold email personalization and optimization for sales teams.', 350),
  ('Fireflies.ai', 'Meetings & Collaboration', 'https://fireflies.ai', 'Automated meeting notes, action items, and intelligent search across all your calls.', 360),
  ('Webex AI Assistant', 'Meetings & Collaboration', 'https://webex.com', 'Cisco''s meeting assistant — real-time transcription, translation, and summaries.', 370),
  ('Harpa AI', 'Research & Knowledge', 'https://harpa.ai', 'AI-driven web scraping and browser automation as a Chrome extension.', 380),
  ('Consensus', 'Research & Knowledge', 'https://consensus.app', 'AI summarization of peer-reviewed research with cited scientific sources.', 390),
  ('Humata', 'Research & Knowledge', 'https://humata.ai', 'AI-powered document and PDF analysis — ask questions, get answers from your files.', 400),
  ('You.com', 'Research & Knowledge', 'https://you.com', 'AI-driven search engine with customizable AI models to choose from.', 410),
  ('Buffer AI', 'Marketing & Social Media', 'https://buffer.com', 'AI-powered social media post creation and scheduling.', 420),
  ('AdCreative.ai', 'Marketing & Social Media', 'https://adcreative.ai', 'AI-generated ad creatives with performance optimization built in.', 430),
  ('Ahrefs AI', 'Marketing & Social Media', 'https://ahrefs.com', 'AI-driven SEO content optimization and keyword research from Ahrefs.', 440),
  ('Moz Pro', 'Marketing & Social Media', 'https://moz.com', 'AI-powered SEO analytics and backlink tracking.', 450),
  ('SE Ranking', 'Marketing & Social Media', 'https://seranking.com', 'AI-powered keyword research and SEO audits at an accessible price.', 460),
  ('SEMrush', 'Marketing & Social Media', 'https://semrush.com', 'AI-assisted keyword tracking and competitive analysis in the leading marketing suite.', 470),
  ('Sprout Social', 'Marketing & Social Media', 'https://sproutsocial.com', 'AI-driven social media management with analytics, scheduling, and insights.', 480),
  ('Later', 'Marketing & Social Media', 'https://later.com', 'AI-driven social media scheduling and content automation.', 490),
  ('Hootsuite', 'Marketing & Social Media', 'https://hootsuite.com', 'AI-powered social media marketing and analytics in one platform.', 500),
  ('Zoho Social', 'Marketing & Social Media', 'https://zoho.com/social', 'AI-driven social media monitoring and brand management.', 510),
  ('Meta AI', 'Marketing & Social Media', 'https://meta.ai', 'Meta''s AI tools for ad targeting and automation across Facebook and Instagram.', 520),
  ('Bardeen', 'Automation', 'https://bardeen.ai', 'AI-driven workflow automation and browser task automation, no code needed.', 530);
