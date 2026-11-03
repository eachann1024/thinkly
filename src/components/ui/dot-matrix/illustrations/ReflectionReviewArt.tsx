import { DotGroup } from "../Dots";
import { DotMatrixMotion } from "../DotMatrixMotion";

/** A page and a review arrow for the standalone reflection record state. */
export function ReflectionReviewArt({ className }: { className?: string }) {
  return (
    <DotMatrixMotion width={160} height={160} className={className}>
      <DotGroup enter={0}>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray=".01 5.5"
          opacity={0.6}
        >
          <path d="M46 35h62v91H46ZM59 23h62v91M60 54h32M60 67h26" />
        </g>
        <path
          d="M22 45v-9h10M134 121v10h-10"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray=".01 5.5"
          opacity={0.25}
        />
      </DotGroup>
      <DotGroup enter={1} loop="glint" period={12}>
        <path
          d="M88 86a18 18 0 1 0 5 21M88 77v12H76"
          fill="none"
          stroke="var(--goose-accent-solid)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray=".01 5"
        />
      </DotGroup>
    </DotMatrixMotion>
  );
}
