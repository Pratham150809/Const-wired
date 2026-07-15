import { useQuery } from "@tanstack/react-query";

import { listChatSessions } from "../client";

/** This user's past chat sessions for the Conversations sidebar (most-recent first). */
export const useChatSessions = () =>
  useQuery({ queryKey: ["chat-sessions"], queryFn: listChatSessions });
