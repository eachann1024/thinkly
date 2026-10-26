import path from "node:path";

interface Job<T = unknown> {
  repositoryId: string | undefined;
  roots: () => string[] | null;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
const normalize = (root: string) => {
  const resolved = path.resolve(root).normalize("NFC");
  return process.platform === "darwin" || process.platform === "win32"
    ? resolved.toLowerCase()
    : resolved;
};
const contains = (parent: string, child: string) => {
  const relative = path.relative(parent, child);
  return (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
};
const overlaps = (left: string[] | null, right: string[] | null) =>
  left === null ||
  right === null ||
  left.some((a) => right.some((b) => contains(a, b) || contains(b, a)));

export class GitSyncJobs {
  private waiting: Job[] = [];
  private active = new Map<Job, string[] | null>();

  has(repositoryId: string) {
    return [...this.active.keys(), ...this.waiting].some(
      (job) => job.repositoryId === repositoryId,
    );
  }

  run<T>(
    repositoryId: string | undefined,
    roots: () => string[] | null,
    operation: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.waiting.push({
        repositoryId,
        roots,
        operation,
        resolve,
        reject,
      } as Job);
      queueMicrotask(() => this.pump());
    });
  }

  private pump() {
    const blocked: (string[] | null)[] = [];
    for (let index = 0; index < this.waiting.length; ) {
      const job = this.waiting[index]!;
      let roots: string[] | null;
      try {
        roots = job.roots()?.map(normalize) ?? null;
      } catch (error) {
        this.waiting.splice(index, 1);
        job.reject(error);
        continue;
      }
      if (
        [...this.active.values(), ...blocked].some((other) =>
          overlaps(roots, other),
        )
      ) {
        blocked.push(roots);
        index++;
        continue;
      }
      this.waiting.splice(index, 1);
      this.active.set(job, roots);
      void Promise.resolve()
        .then(job.operation)
        .then(job.resolve, job.reject)
        .finally(() => {
          this.active.delete(job);
          this.pump();
        });
    }
  }
}
