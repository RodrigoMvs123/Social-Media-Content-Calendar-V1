import { Link } from 'wouter';
import { Book, Github, Slack } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} Social Media Calendar. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <Link 
              href="/docs" 
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Documentation</span>
              <Book className="h-5 w-5" />
            </Link>
            <Link 
              href="https://github.com" 
              className="text-gray-400 hover:text-gray-500" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="sr-only">GitHub</span>
              <Github className="h-5 w-5" />
            </Link>
            <Link 
              href="https://slack.com" 
              className="text-gray-400 hover:text-gray-500" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="sr-only">Slack</span>
              <Slack className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
