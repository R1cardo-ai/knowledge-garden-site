import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/ui-kit/templates/showcase.html?variant=standard');
}
