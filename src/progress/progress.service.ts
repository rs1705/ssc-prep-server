import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import type { FirebaseUser } from 'src/auth/current-user.decorator';
import { emptyDoc, mergeDocs, normalizeDoc, type ProgressDoc } from './merge';

/** A synced document stays well under this; anything bigger is rejected. */
const MAX_BYTES = 1_500_000;

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async get(firebaseUser: FirebaseUser): Promise<ProgressDoc> {
    const user = await this.auth.syncUserWithFirebase(firebaseUser);
    const row = await this.prisma.userProgress.findUnique({
      where: { userId: user.id },
    });
    return row ? normalizeDoc(row.data) : emptyDoc();
  }

  /**
   * Merge a device's copy into the stored one and return the result, which the
   * device then adopts. Concurrent syncs from two devices are retried so
   * neither overwrites the other.
   */
  async sync(
    firebaseUser: FirebaseUser,
    incoming: unknown,
  ): Promise<ProgressDoc> {
    if (JSON.stringify(incoming ?? null).length > MAX_BYTES) {
      throw new PayloadTooLargeException('Progress document is too large.');
    }
    const user = await this.auth.syncUserWithFirebase(firebaseUser);
    const device = normalizeDoc(incoming);

    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await this.prisma.userProgress.findUnique({
        where: { userId: user.id },
      });
      const merged = mergeDocs(
        row ? normalizeDoc(row.data) : emptyDoc(),
        device,
      );
      const data = merged as unknown as object;

      if (!row) {
        try {
          await this.prisma.userProgress.create({
            data: { userId: user.id, data },
          });
          return merged;
        } catch {
          continue; // Another device created it first: merge with that.
        }
      }
      const { count } = await this.prisma.userProgress.updateMany({
        where: { userId: user.id, updatedAt: row.updatedAt },
        data: { data },
      });
      if (count === 1) return merged;
    }
    throw new Error('Could not save progress after several attempts.');
  }
}
