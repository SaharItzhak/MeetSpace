/** Generates a random, hard-to-guess Jitsi Meet room id for a booking's video call link. */
export function generateJitsiRoomId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "meetspace-";
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export function jitsiRoomUrl(roomId: string): string {
  return `https://meet.jit.si/${roomId}`;
}

/** Builds the Google Calendar event description for an approved booking. */
export function buildEventDescription(params: {
  requesterPhone: string;
  videoCallUrl: string;
  note?: string | null;
}): string {
  const lines = [
    `Phone call: ${params.requesterPhone}`,
    `Video call (no app required): ${params.videoCallUrl}`,
  ];
  if (params.note) {
    lines.push("", `Note from requester: ${params.note}`);
  }
  lines.push("", "Booked via MeetSpace.");
  return lines.join("\n");
}
