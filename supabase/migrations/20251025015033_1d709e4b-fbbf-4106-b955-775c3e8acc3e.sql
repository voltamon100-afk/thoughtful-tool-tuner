-- Create sessions table
CREATE TABLE public.sessions (
  id TEXT PRIMARY KEY,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create session_members table for tracking participants
CREATE TABLE public.session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create command_history table
CREATE TABLE public.command_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  output TEXT,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Anyone can view sessions"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- RLS Policies for session_members
CREATE POLICY "Anyone can view session members"
  ON public.session_members FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join a session"
  ON public.session_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can remove themselves from sessions"
  ON public.session_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for command_history
CREATE POLICY "Session members can view command history"
  ON public.command_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_members
      WHERE session_id = command_history.session_id
    )
  );

CREATE POLICY "Session members can add command history"
  ON public.command_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_members
      WHERE session_id = command_history.session_id
    )
  );

-- Enable realtime for presence tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_members;