export interface ClubRecord {
  readonly id: string;
  readonly name: string;
  readonly rarity: string;
  readonly country?: string;
  readonly [key: string]: unknown;
}

export interface PitchScriptAdapter {
  getClub(name: string): Promise<ClubRecord | null>;

  listClubs(): Promise<readonly ClubRecord[]>;

  updateClub(
    name: string,
    property: string,
    value: unknown,
  ): Promise<ClubRecord | null>;

  deleteClub(name: string): Promise<boolean>;
}
