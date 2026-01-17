import { useCountUp } from "@/hooks/use-count-up";

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter = ({ 
  end, 
  suffix = "", 
  duration = 2000,
  className = ""
}: AnimatedCounterProps) => {
  const { count, ref } = useCountUp({ end, duration });

  return (
    <div ref={ref} className={className}>
      {count}{suffix}
    </div>
  );
};
