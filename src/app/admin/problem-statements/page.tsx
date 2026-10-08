'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCategories } from '@/app/actions/categories';
import { getAllProblemsForAdmin, publishProblem, unpublishProblem, publishAllInCategory, unpublishAllInCategory } from '@/app/actions/problem-statements';
import { FileText, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Select } from '@/components/ui/select';

export default function ProblemStatementsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [problems, setProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchCats = async () => {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
        if (res.data.length > 0) {
          setSelectedCategory(res.data[0].id);
        }
      }
      setIsLoading(false);
    };
    fetchCats();
  }, []);

  const fetchProblems = async (categoryId: string) => {
    setIsLoading(true);
    const res = await getAllProblemsForAdmin(categoryId);
    if (res.success && res.data) {
      setProblems(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedCategory) {
      fetchProblems(selectedCategory);
    }
  }, [selectedCategory]);

  const handlePublish = async (id: string, isPublish: boolean) => {
    setActionLoading(id);
    if (isPublish) {
      await publishProblem(id);
    } else {
      await unpublishProblem(id);
    }
    await fetchProblems(selectedCategory);
    setActionLoading(null);
  };

  const handleBulk = async (isPublish: boolean) => {
    setActionLoading('bulk');
    if (isPublish) {
      await publishAllInCategory(selectedCategory);
    } else {
      await unpublishAllInCategory(selectedCategory);
    }
    await fetchProblems(selectedCategory);
    setActionLoading(null);
  };

  const publishedCount = problems.filter(p => p.published).length;
  const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-purple-500" />
            Problem Statements
          </h1>
          <p className="text-gray-400 mt-1">Manage and publish problem statements per category.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-64">
            <Select
              label="Select Category"
              options={categoryOptions}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            />
          </div>
          {selectedCategory && (
            <div className="flex gap-2 pt-6">
              <Button 
                variant="outline" 
                className="border-green-500/50 hover:bg-green-500/10"
                onClick={() => handleBulk(true)}
                isLoading={actionLoading === 'bulk'}
              >
                Publish All
              </Button>
              <Button 
                variant="outline" 
                className="border-red-500/50 hover:bg-red-500/10"
                onClick={() => handleBulk(false)}
                isLoading={actionLoading === 'bulk'}
              >
                Unpublish All
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-space-grotesk font-bold">Category Problems</h2>
          <Badge variant={publishedCount === 20 ? 'default' : 'outline'}>
            {publishedCount} / {problems.length} Published
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading && !actionLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : problems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No problem statements found for this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {problems.map((problem) => (
                <div 
                  key={problem.id}
                  className={`p-4 rounded-lg border ${problem.published ? 'border-green-500/30 bg-green-500/5' : 'border-[#2a2a3a] bg-[#16161f]'} relative flex flex-col`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="mb-2">#{problem.number}</Badge>
                    {problem.published ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-400">PUBLISHED</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">DRAFT</Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{problem.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 flex-1">{problem.description}</p>
                  
                  <div className="mt-auto pt-4 border-t border-[#2a2a3a]">
                    <Button 
                      variant={problem.published ? "outline" : "default"}
                      className={`w-full ${problem.published ? 'border-red-500/50 hover:bg-red-500/10 text-red-400' : ''}`}
                      onClick={() => handlePublish(problem.id, !problem.published)}
                      isLoading={actionLoading === problem.id}
                    >
                      {problem.published ? (
                        <><EyeOff className="w-4 h-4 mr-2" /> Unpublish</>
                      ) : (
                        <><Eye className="w-4 h-4 mr-2" /> Publish</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
