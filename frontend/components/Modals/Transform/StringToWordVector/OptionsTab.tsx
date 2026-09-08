import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { INDONESIAN_STOPWORDS, ENGLISH_STOPWORDS } from "./constants/stopwords";

interface OptionsTabProps {
  config: any;
  setConfig: (config: any) => void;
}

export const OptionsTab: React.FC<OptionsTabProps> = ({ config, setConfig }) => {
  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleNestedConfigChange = (category: string, key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  return (
    <div className="flex flex-col h-full z-0">
      <ScrollArea className="h-full pr-4">
        <div className="space-y-8 pb-8 pt-4">
          
          {/* Text Preprocessing */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Text Preprocessing</h3>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="lowercase" 
                checked={config.lowercase}
                onCheckedChange={(checked) => handleConfigChange("lowercase", checked === true)}
              />
              <Label htmlFor="lowercase" className="text-sm font-normal cursor-pointer">
                Lowercase
              </Label>
            </div>
          </div>

          {/* Stopwords Removal */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Stopwords Removal</h3>
            <RadioGroup 
              value={config.stopwords.method} 
              onValueChange={(val) => handleNestedConfigChange("stopwords", "method", val)}
              className="flex w-full space-x-8"
            >
              {/* Kiri: Pilihan Standar */}
              <div className="flex flex-col space-y-3 pt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="sw-none" />
                  <Label htmlFor="sw-none" className="font-normal cursor-pointer">None</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="indonesian" id="sw-id" />
                  <Label htmlFor="sw-id" className="font-normal cursor-pointer">Indonesian</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="english" id="sw-en" />
                  <Label htmlFor="sw-en" className="font-normal cursor-pointer">English</Label>
                </div>
              </div>

              {/* Kanan: Custom dan Textarea */}
              <div className="flex flex-col w-full max-w-sm space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="sw-custom" />
                  <Label htmlFor="sw-custom" className="font-normal cursor-pointer">Custom</Label>
                </div>
                <Textarea 
                  value={
                    config.stopwords.method === "none" ? "" :
                    config.stopwords.method === "indonesian" ? INDONESIAN_STOPWORDS.join("\n") :
                    config.stopwords.method === "english" ? ENGLISH_STOPWORDS.join("\n") :
                    config.stopwords.customList
                  }
                  onChange={(e) => {
                    setConfig((prev: any) => ({
                      ...prev,
                      stopwords: {
                        ...prev.stopwords,
                        method: "custom",
                        customList: e.target.value
                      }
                    }));
                  }}
                  placeholder={config.stopwords.method === "none" ? "Ketik kata di sini untuk membuat custom stopwords..." : "Enter stopwords, one per line..."}
                  className="h-32 text-sm"
                />
              </div>
            </RadioGroup>
          </div>

          {/* Stemming */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Stemming</h3>
            <RadioGroup 
              value={config.stemming.method} 
              onValueChange={(val) => handleNestedConfigChange("stemming", "method", val)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="stem-none" />
                <Label htmlFor="stem-none" className="font-normal cursor-pointer">None</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="indonesian" id="stem-id" />
                <Label htmlFor="stem-id" className="font-normal cursor-pointer">Indonesian (Sastrawi)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="english" id="stem-en" />
                <Label htmlFor="stem-en" className="font-normal cursor-pointer">English (Porter)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Tokenizer & Delimiters */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Tokenizer</h3>
              <RadioGroup 
                value={config.tokenizer.type} 
                onValueChange={(val) => handleNestedConfigChange("tokenizer", "type", val)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="word" id="tok-word" />
                  <Label htmlFor="tok-word" className="font-normal cursor-pointer">Word</Label>
                </div>
                <div className="flex items-center space-x-2 h-8">
                  <RadioGroupItem value="ngram" id="tok-ngram" />
                  <Label htmlFor="tok-ngram" className="font-normal cursor-pointer pr-2">N-gram</Label>
                  {/* Inline min/max size */}
                  <div className={`flex items-center space-x-2 transition-opacity ${config.tokenizer.type === "ngram" ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                    <Label htmlFor="ngram-max" className="text-xs text-muted-foreground">max size</Label>
                    <Input 
                      id="ngram-max" 
                      type="number" 
                      min={1} 
                      max={10} 
                      className="w-16 h-7 text-xs px-2" 
                      value={config.tokenizer.maxSize} 
                      onChange={(e) => handleNestedConfigChange("tokenizer", "maxSize", parseInt(e.target.value) || 1)}
                    />
                    <Label htmlFor="ngram-min" className="text-xs text-muted-foreground ml-2">min size</Label>
                    <Input 
                      id="ngram-min" 
                      type="number" 
                      min={1} 
                      max={10} 
                      className="w-16 h-7 text-xs px-2" 
                      value={config.tokenizer.minSize}
                      onChange={(e) => handleNestedConfigChange("tokenizer", "minSize", parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2 max-w-xs pt-1">
              <Label htmlFor="delimiters" className="text-sm font-semibold">Delimiters</Label>
              <Input 
                id="delimiters" 
                value={config.delimiters} 
                onChange={(e) => handleConfigChange("delimiters", e.target.value)}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>

          {/* Vectorization Method */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Vectorization Method</h3>
            
            {/* Term Frequency (TF) */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Term Frequency (TF)</Label>
              <RadioGroup 
                value={config.vectorization.tfMethod} 
                onValueChange={(val) => handleNestedConfigChange("vectorization", "tfMethod", val)}
                className="grid grid-cols-2 gap-2 pt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="vec-none" disabled={config.vectorization.idfMethod === "none"} />
                  <Label htmlFor="vec-none" className={`font-normal cursor-pointer text-sm ${config.vectorization.idfMethod === "none" ? "opacity-50" : ""}`}>None</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="binary" id="vec-binary" />
                  <Label htmlFor="vec-binary" className="font-normal cursor-pointer text-sm">Boolean (0/1)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="raw" id="vec-raw" />
                  <Label htmlFor="vec-raw" className="font-normal cursor-pointer text-sm">Natural TF (Word Count)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normalized" id="vec-normalized" />
                  <Label htmlFor="vec-normalized" className="font-normal cursor-pointer text-sm">Normalized TF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="log" id="vec-log" />
                  <Label htmlFor="vec-log" className="font-normal cursor-pointer text-sm">Log TF</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Inverse Document Frequency (IDF) */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Inverse Document Frequency (IDF)</Label>
              <RadioGroup 
                value={config.vectorization.idfMethod} 
                onValueChange={(val) => handleNestedConfigChange("vectorization", "idfMethod", val)}
                className="grid grid-cols-2 gap-2 pt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="idf-none" disabled={config.vectorization.tfMethod === "none"} />
                  <Label htmlFor="idf-none" className={`font-normal cursor-pointer text-sm ${config.vectorization.tfMethod === "none" ? "opacity-50" : ""}`}>None</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="idf" id="idf-standard" />
                  <Label htmlFor="idf-standard" className="font-normal cursor-pointer text-sm">Standard IDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="smooth" id="idf-smooth" />
                  <Label htmlFor="idf-smooth" className="font-normal cursor-pointer text-sm">Smooth IDF</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Words to Keep */}
          <div className="space-y-2 max-w-xs pt-1">
            <Label htmlFor="words-to-keep" className="text-sm font-semibold">Words to Keep</Label>
            <Input 
              id="words-to-keep" 
              type="number"
              min={1}
              value={config.wordsToKeep} 
              onChange={(e) => handleConfigChange("wordsToKeep", parseInt(e.target.value) || 1000)}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Jumlah kata/kolom maksimum yang akan disimpan (diprioritaskan berdasarkan metode vektorisasi yang dipilih).
            </p>
          </div>
          
        </div>
      </ScrollArea>
    </div>
  );
};
